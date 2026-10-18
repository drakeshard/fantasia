import type {
  RegistryAssetVersionRecord,
  RegistrySnapshot,
  RuntimeManifestSnapshot,
  StudioAssetSourceSummary,
  StudioReadIssue,
  StudioRuntimeDerivativeSummary,
  StudioValidationSummary,
} from "../../../packages/studio-read-model/src/index.ts";

export interface RegistryAssetRelationRecord {
  readonly source_asset_id: string;
  readonly relation_type: string;
  readonly target_asset_id: string;
}

type AssetChangeEvent = RegistrySnapshot["changeEvents"][number] & {
  readonly asset_version_id: string | null;
};

export type AssetWorkspaceRegistrySnapshot = Omit<RegistrySnapshot, "changeEvents"> & {
  readonly assetRelations: readonly RegistryAssetRelationRecord[];
  readonly changeEvents: readonly AssetChangeEvent[];
};

export interface StudioAssetVersionSummary {
  readonly versionId: string;
  readonly versionNumber: number;
  readonly lifecycle: string;
  readonly current: boolean;
  readonly createdAt: string | null;
  readonly source: StudioAssetSourceSummary;
  readonly validations: readonly StudioValidationSummary[];
}

export interface StudioAssetRelationSummary {
  readonly type: string;
  readonly targetSemanticId: string;
  readonly targetLabel: string;
  readonly valid: boolean;
}

export interface StudioAssetHistorySummary {
  readonly eventType: string;
  readonly occurredAt: string;
  readonly sourceKind: string | null;
}

export interface StudioAssetWorkspaceRecord {
  readonly semanticId: string;
  readonly ownerSemanticId: string;
  readonly ownerEntityType: string | null;
  readonly ownerDisplayName: string;
  readonly role: string;
  readonly variant: string | null;
  readonly lifecycle: string | null;
  readonly readiness: "ready" | "warning" | "blocked" | "unknown";
  readonly currentVersion: StudioAssetSourceSummary | null;
  readonly derivativeRequired: boolean;
  readonly versions: readonly StudioAssetVersionSummary[];
  readonly relations: readonly StudioAssetRelationSummary[];
  readonly validations: readonly StudioValidationSummary[];
  readonly runtimeDerivatives: readonly StudioRuntimeDerivativeSummary[];
  readonly history: readonly StudioAssetHistorySummary[];
  readonly issues: readonly StudioReadIssue[];
}

function latestValidation(
  records: readonly AssetWorkspaceRegistrySnapshot["validationResults"][number][],
): StudioValidationSummary[] {
  const byDimension = new Map<string, AssetWorkspaceRegistrySnapshot["validationResults"][number]>();
  for (const record of records) {
    if (!byDimension.has(record.dimension)) byDimension.set(record.dimension, record);
  }
  return [...byDimension.values()].map((record) => ({
    dimension: record.dimension,
    outcome: record.outcome,
    blocking: record.is_blocking,
    checkedAt: record.checked_at,
  }));
}

function sourceSummary(
  assetId: string,
  version: RegistryAssetVersionRecord,
): StudioAssetSourceSummary {
  return {
    semanticAssetId: assetId,
    versionId: version.id,
    versionNumber: version.version_number,
    providerKind: version.provider_kind,
    sourceAvailable: Boolean(version.provider_ref),
    mediaType: version.media_type,
    byteSize: version.byte_size,
    dimensions:
      version.width_px && version.height_px
        ? { width: version.width_px, height: version.height_px }
        : null,
    checksum: {
      algorithm: version.checksum_algorithm,
      value: version.checksum,
    },
    providerReference: version.provider_ref
      ? { visibility: "redacted" }
      : { visibility: "unavailable" },
    operations: version.provider_ref ? ["metadata", "preview", "download"] : ["metadata"],
    provenance: {
      authority: "provider",
      source: version.provider_kind,
      observedAt: version.updated_at,
      canonical: true,
    },
  };
}

function readinessFor(
  validations: readonly StudioValidationSummary[],
  issues: readonly StudioReadIssue[],
): StudioAssetWorkspaceRecord["readiness"] {
  if (
    issues.some((issue) => issue.severity === "blocking") ||
    validations.some((validation) => validation.blocking && validation.outcome !== "PASSED")
  ) return "blocked";
  if (
    issues.some((issue) => issue.severity === "warning") ||
    validations.some((validation) => validation.outcome === "WARNING")
  ) return "warning";
  if (validations.length > 0 && validations.every((validation) => validation.outcome === "PASSED")) {
    return "ready";
  }
  return "unknown";
}

export function composeAssetWorkspace(
  registry: AssetWorkspaceRegistrySnapshot,
  runtimeManifest: RuntimeManifestSnapshot,
): readonly StudioAssetWorkspaceRecord[] {
  const manifestById = new Map(runtimeManifest.assets.map((entry) => [entry.id, entry] as const));
  const knownAssets = new Set(registry.assets.map((asset) => asset.semantic_id));

  return registry.assets.map((asset) => {
    const owner = registry.contentEntities.find((entity) => entity.semantic_id === asset.owning_entity_id);
    const versions = registry.assetVersions
      .filter((version) => version.asset_id === asset.semantic_id)
      .sort((a, b) => b.version_number - a.version_number);
    const current = asset.current_version_id
      ? versions.find((version) => version.id === asset.current_version_id) ?? null
      : null;
    const issues: StudioReadIssue[] = [];

    if (!owner) {
      issues.push({
        code: "invalid-relation",
        severity: "blocking",
        message: `Semantic asset owner ${asset.owning_entity_id} is missing from the registry.`,
        source: "registry",
      });
    }
    if (!current) {
      issues.push({
        code: "current-version-missing",
        severity: asset.derivative_required ? "blocking" : "warning",
        message: "Semantic asset has no valid current source/master version.",
        source: "registry",
      });
    }

    const assetValidations = latestValidation(
      registry.validationResults.filter((validation) => validation.asset_id === asset.semantic_id),
    );
    const currentVersionValidations = current
      ? latestValidation(
          registry.validationResults.filter(
            (validation) => validation.asset_version_id === current.id,
          ),
        )
      : [];
    const validations = [...assetValidations, ...currentVersionValidations];
    for (const validation of validations) {
      if (validation.blocking && validation.outcome !== "PASSED") {
        issues.push({
          code: "validation-blocking",
          severity: "blocking",
          message: `${validation.dimension} is ${validation.outcome}.`,
          source: "registry",
        });
      } else if (validation.outcome === "WARNING") {
        issues.push({
          code: "validation-warning",
          severity: "warning",
          message: `${validation.dimension} has a warning.`,
          source: "registry",
        });
      }
    }

    const runtimeDerivatives = registry.runtimeDerivatives
      .filter((derivative) => derivative.asset_id === asset.semantic_id)
      .map<StudioRuntimeDerivativeSummary>((derivative) => {
        const accepted =
          manifestById.get(asset.semantic_id) ?? manifestById.get(derivative.semantic_id) ?? null;
        if (!accepted && ["RUNTIME READY", "PUBLISHED"].includes(current?.lifecycle ?? "")) {
          issues.push({
            code: "runtime-mapping-missing",
            severity: "blocking",
            message: "Runtime-ready registry state has no accepted Git manifest mapping.",
            source: "runtime-manifest",
          });
        }
        if (accepted && derivative.runtime_path && accepted.path !== derivative.runtime_path) {
          issues.push({
            code: "runtime-derivative-mismatch",
            severity: "warning",
            message: `Registry runtime path ${derivative.runtime_path} differs from accepted manifest path ${accepted.path}.`,
            source: "runtime-manifest",
          });
        }
        return {
          semanticId: derivative.semantic_id,
          assetId: derivative.asset_id,
          mediaType: derivative.media_type,
          outputFormat: derivative.output_format,
          runtimePath: derivative.runtime_path,
          technicalState: derivative.technical_state,
          manifestMapped: Boolean(accepted),
          acceptedRuntimePath: accepted?.path ?? null,
        };
      });

    const relations = registry.assetRelations
      .filter((relation) => relation.source_asset_id === asset.semantic_id)
      .map<StudioAssetRelationSummary>((relation) => {
        const valid = knownAssets.has(relation.target_asset_id);
        if (!valid) {
          issues.push({
            code: "invalid-relation",
            severity: "blocking",
            message: `Asset relation ${relation.relation_type} points to missing ${relation.target_asset_id}.`,
            source: "registry",
          });
        }
        return {
          type: relation.relation_type,
          targetSemanticId: relation.target_asset_id,
          targetLabel: relation.target_asset_id,
          valid,
        };
      });

    const versionRows = versions.map<StudioAssetVersionSummary>((version) => ({
      versionId: version.id,
      versionNumber: version.version_number,
      lifecycle: version.lifecycle,
      current: version.id === asset.current_version_id,
      createdAt: version.updated_at ?? null,
      source: sourceSummary(asset.semantic_id, version),
      validations: latestValidation(
        registry.validationResults.filter(
          (validation) => validation.asset_version_id === version.id,
        ),
      ),
    }));

    const versionIds = new Set(versions.map((version) => version.id));
    const history = registry.changeEvents
      .filter(
        (event) =>
          event.asset_id === asset.semantic_id ||
          (event.asset_version_id ? versionIds.has(event.asset_version_id) : false),
      )
      .slice(0, 50)
      .map<StudioAssetHistorySummary>((event) => ({
        eventType: event.event_type,
        occurredAt: event.occurred_at,
        sourceKind: event.source_kind,
      }));

    return {
      semanticId: asset.semantic_id,
      ownerSemanticId: asset.owning_entity_id,
      ownerEntityType: owner?.entity_type ?? null,
      ownerDisplayName: owner?.display_label ?? asset.owning_entity_id,
      role: asset.role,
      variant: asset.variant,
      lifecycle: current?.lifecycle ?? null,
      readiness: readinessFor(validations, issues),
      currentVersion: current ? sourceSummary(asset.semantic_id, current) : null,
      derivativeRequired: asset.derivative_required,
      versions: versionRows,
      relations,
      validations,
      runtimeDerivatives,
      history,
      issues,
    };
  });
}
