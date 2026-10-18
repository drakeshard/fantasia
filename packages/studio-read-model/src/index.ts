export const STUDIO_READ_MODEL_VERSION = 1 as const;

export type StudioAuthorityKind = "git" | "registry" | "provider" | "runtime-manifest";
export type StudioIssueCode =
  | "canonical-unavailable"
  | "canonical-malformed"
  | "registry-missing"
  | "canonical-path-mismatch"
  | "current-version-missing"
  | "provider-source-missing"
  | "provider-reference-redacted"
  | "provider-reference-stale"
  | "invalid-relation"
  | "validation-blocking"
  | "validation-warning"
  | "runtime-mapping-missing"
  | "runtime-derivative-mismatch"
  | "unauthorized-provider-detail"
  | "transient-provider-error";

export interface StudioProvenance {
  readonly authority: StudioAuthorityKind;
  readonly source: string;
  readonly revision?: string;
  readonly observedAt?: string;
  readonly canonical: boolean;
}

export interface StudioReadIssue {
  readonly code: StudioIssueCode;
  readonly severity: "info" | "warning" | "blocking";
  readonly message: string;
  readonly source?: StudioAuthorityKind;
}

export interface StudioValidationSummary {
  readonly dimension: string;
  readonly outcome: "PASSED" | "WARNING" | "FAILED" | "UNKNOWN";
  readonly blocking: boolean;
  readonly checkedAt?: string;
}

export interface StudioRelationSummary {
  readonly type: string;
  readonly targetSemanticId: string;
  readonly valid: boolean;
}

export interface StudioAssetSourceSummary {
  readonly semanticAssetId: string;
  readonly versionId: string | null;
  readonly versionNumber: number | null;
  readonly providerKind: string | null;
  readonly sourceAvailable: boolean;
  readonly mediaType: string | null;
  readonly byteSize: number | null;
  readonly dimensions: { readonly width: number; readonly height: number } | null;
  readonly checksum: { readonly algorithm: string; readonly value: string } | null;
  readonly providerReference: {
    readonly visibility: "redacted" | "opaque" | "unavailable";
    readonly token?: string;
  };
  readonly operations: readonly ("metadata" | "preview" | "download")[];
  readonly provenance: StudioProvenance;
}

export interface StudioRuntimeDerivativeSummary {
  readonly semanticId: string;
  readonly assetId: string;
  readonly mediaType: string;
  readonly outputFormat: string;
  readonly runtimePath: string | null;
  readonly technicalState: string;
  readonly manifestMapped: boolean;
  readonly acceptedRuntimePath: string | null;
}

export interface StudioAssetSummary {
  readonly semanticId: string;
  readonly role: string;
  readonly variant: string | null;
  readonly lifecycle: string | null;
  readonly currentVersion: StudioAssetSourceSummary | null;
  readonly derivativeRequired: boolean;
  readonly runtimeDerivatives: readonly StudioRuntimeDerivativeSummary[];
  readonly issues: readonly StudioReadIssue[];
}

export interface StudioHistorySummary {
  readonly eventType: string;
  readonly occurredAt: string;
  readonly sourceKind: string | null;
}

export interface StudioPermissionPresentation {
  readonly role: string;
  readonly capabilities: readonly string[];
  readonly canRead: boolean;
  readonly canEditRegistryMetadata: boolean;
  readonly canApprove: boolean;
  readonly canFreeze: boolean;
  readonly canManageMembership: boolean;
}

export interface StudioCanonicalSummary {
  readonly semanticId: string;
  readonly entityType: string;
  readonly displayName: string;
  readonly canonicalPath: string;
  readonly canonicalData: Readonly<Record<string, unknown>>;
  readonly provenance: StudioProvenance;
  readonly preview?: {
    readonly data: Readonly<Record<string, unknown>>;
    readonly provenance: StudioProvenance;
  };
}

export interface StudioEntityReadModel {
  readonly readModelVersion: typeof STUDIO_READ_MODEL_VERSION;
  readonly semanticId: string;
  readonly entityType: string;
  readonly displayName: string;
  readonly canonical: StudioCanonicalSummary;
  readonly lifecycle: string | null;
  readonly schemaVersion: number | null;
  readonly validations: readonly StudioValidationSummary[];
  readonly relations: readonly StudioRelationSummary[];
  readonly assets: readonly StudioAssetSummary[];
  readonly history: readonly StudioHistorySummary[];
  readonly permissions: StudioPermissionPresentation;
  readonly provenance: readonly StudioProvenance[];
  readonly issues: readonly StudioReadIssue[];
}

export interface StudioCollectionRow {
  readonly semanticId: string;
  readonly entityType: string;
  readonly displayName: string;
  readonly lifecycle: string | null;
  readonly readiness: "ready" | "warning" | "blocked" | "unknown";
  readonly issueCount: number;
  readonly canonicalPath: string;
}

export interface StudioSearchQuery {
  readonly text?: string;
  readonly entityType?: string;
  readonly lifecycle?: string;
  readonly readiness?: StudioCollectionRow["readiness"];
  readonly offset?: number;
  readonly limit?: number;
}

export interface StudioSearchResult {
  readonly total: number;
  readonly offset: number;
  readonly limit: number;
  readonly rows: readonly StudioCollectionRow[];
}

export interface RegistryContentEntityRecord {
  readonly semantic_id: string;
  readonly entity_type: string;
  readonly display_label: string | null;
  readonly canonical_git_path: string | null;
  readonly schema_version: number;
  readonly lifecycle: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface RegistryAssetRecord {
  readonly semantic_id: string;
  readonly owning_entity_id: string;
  readonly role: string;
  readonly variant: string | null;
  readonly current_version_id: string | null;
  readonly derivative_required: boolean;
}

export interface RegistryAssetVersionRecord {
  readonly id: string;
  readonly asset_id: string;
  readonly version_number: number;
  readonly lifecycle: string;
  readonly provider_kind: string;
  readonly provider_ref: string;
  readonly media_type: string;
  readonly width_px: number | null;
  readonly height_px: number | null;
  readonly byte_size: number;
  readonly checksum_algorithm: string;
  readonly checksum: string;
  readonly updated_at?: string;
}

export interface RegistryEntityRelationRecord {
  readonly source_entity_id: string;
  readonly relation_type: string;
  readonly target_entity_id: string;
}

export interface RegistryRuntimeDerivativeRecord {
  readonly semantic_id: string;
  readonly asset_id: string;
  readonly media_type: string;
  readonly output_format: string;
  readonly runtime_path: string | null;
  readonly technical_state: string;
}

export interface RegistryValidationRecord {
  readonly id: string;
  readonly entity_id: string | null;
  readonly asset_id: string | null;
  readonly asset_version_id: string | null;
  readonly runtime_derivative_id: string | null;
  readonly dimension: string;
  readonly outcome: "PASSED" | "WARNING" | "FAILED" | "UNKNOWN";
  readonly is_blocking: boolean;
  readonly checked_at: string;
}

export interface RegistryChangeEventRecord {
  readonly id: string;
  readonly entity_id: string | null;
  readonly asset_id: string | null;
  readonly event_type: string;
  readonly source_kind: string | null;
  readonly occurred_at: string;
}

export interface RegistrySnapshot {
  readonly observedAt: string;
  readonly contentEntities: readonly RegistryContentEntityRecord[];
  readonly assets: readonly RegistryAssetRecord[];
  readonly assetVersions: readonly RegistryAssetVersionRecord[];
  readonly entityRelations: readonly RegistryEntityRelationRecord[];
  readonly runtimeDerivatives: readonly RegistryRuntimeDerivativeRecord[];
  readonly validationResults: readonly RegistryValidationRecord[];
  readonly changeEvents: readonly RegistryChangeEventRecord[];
}

export interface RuntimeManifestEntry {
  readonly id: string;
  readonly path: string;
  readonly mediaType: string;
  readonly version: number;
}

export interface RuntimeManifestSnapshot {
  readonly schemaVersion: number;
  readonly revision: string;
  readonly path: string;
  readonly assets: readonly RuntimeManifestEntry[];
}

export interface ComposeStudioEntityInput {
  readonly canonical: StudioCanonicalSummary;
  readonly registry: RegistrySnapshot;
  readonly runtimeManifest: RuntimeManifestSnapshot;
  readonly permissions: StudioPermissionPresentation;
  readonly exposeProviderReference?: boolean;
}

export function permissionPresentation(
  role: string,
  capabilities: readonly string[],
): StudioPermissionPresentation {
  return {
    role,
    capabilities: [...capabilities],
    canRead: capabilities.includes("studio.read"),
    canEditRegistryMetadata: capabilities.includes("registry.metadata.edit"),
    canApprove: capabilities.includes("review.approve"),
    canFreeze: capabilities.includes("review.freeze"),
    canManageMembership: capabilities.includes("studio.membership.manage"),
  };
}

function latestValidation(records: readonly RegistryValidationRecord[]): StudioValidationSummary[] {
  const byDimension = new Map<string, RegistryValidationRecord>();
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

function readinessFor(
  validations: readonly StudioValidationSummary[],
  issues: readonly StudioReadIssue[],
): StudioCollectionRow["readiness"] {
  if (
    issues.some((issue) => issue.severity === "blocking") ||
    validations.some((item) => item.blocking && item.outcome !== "PASSED")
  )
    return "blocked";
  if (
    issues.some((issue) => issue.severity === "warning") ||
    validations.some((item) => item.outcome === "WARNING")
  )
    return "warning";
  if (validations.length > 0 && validations.every((item) => item.outcome === "PASSED"))
    return "ready";
  return "unknown";
}

export function composeStudioEntity(input: ComposeStudioEntityInput): StudioEntityReadModel {
  const { canonical, registry, runtimeManifest, permissions } = input;
  const entity =
    registry.contentEntities.find((item) => item.semantic_id === canonical.semanticId) ?? null;
  const issues: StudioReadIssue[] = [];

  if (!entity) {
    issues.push({
      code: "registry-missing",
      severity: "warning",
      message: "Canonical entity has no registry metadata.",
      source: "registry",
    });
  } else if (entity.canonical_git_path && entity.canonical_git_path !== canonical.canonicalPath) {
    issues.push({
      code: "canonical-path-mismatch",
      severity: "blocking",
      message: `Registry canonical path ${entity.canonical_git_path} does not match Git source ${canonical.canonicalPath}.`,
      source: "registry",
    });
  }

  const entityValidations = latestValidation(
    registry.validationResults.filter((item) => item.entity_id === canonical.semanticId),
  );
  for (const validation of entityValidations) {
    if (validation.blocking && validation.outcome !== "PASSED")
      issues.push({
        code: "validation-blocking",
        severity: "blocking",
        message: `${validation.dimension} is ${validation.outcome}.`,
        source: "registry",
      });
    else if (validation.outcome === "WARNING")
      issues.push({
        code: "validation-warning",
        severity: "warning",
        message: `${validation.dimension} has a warning.`,
        source: "registry",
      });
  }

  const knownCanonicalIds = new Set(registry.contentEntities.map((item) => item.semantic_id));
  knownCanonicalIds.add(canonical.semanticId);
  const relations = registry.entityRelations
    .filter((item) => item.source_entity_id === canonical.semanticId)
    .map((item) => {
      const valid = knownCanonicalIds.has(item.target_entity_id);
      if (!valid)
        issues.push({
          code: "invalid-relation",
          severity: "blocking",
          message: `Relation ${item.relation_type} points to missing ${item.target_entity_id}.`,
          source: "registry",
        });
      return { type: item.relation_type, targetSemanticId: item.target_entity_id, valid };
    });

  const manifestById = new Map(runtimeManifest.assets.map((entry) => [entry.id, entry] as const));
  const assets = registry.assets
    .filter((item) => item.owning_entity_id === canonical.semanticId)
    .map<StudioAssetSummary>((asset) => {
      const assetIssues: StudioReadIssue[] = [];
      const currentVersion = asset.current_version_id
        ? (registry.assetVersions.find(
            (item) => item.id === asset.current_version_id && item.asset_id === asset.semantic_id,
          ) ?? null)
        : null;
      if (!currentVersion)
        assetIssues.push({
          code: "current-version-missing",
          severity: asset.derivative_required ? "blocking" : "warning",
          message: "Semantic asset has no valid current version.",
          source: "registry",
        });

      const source: StudioAssetSourceSummary | null = currentVersion
        ? {
            semanticAssetId: asset.semantic_id,
            versionId: currentVersion.id,
            versionNumber: currentVersion.version_number,
            providerKind: currentVersion.provider_kind,
            sourceAvailable: true,
            mediaType: currentVersion.media_type,
            byteSize: currentVersion.byte_size,
            dimensions:
              currentVersion.width_px && currentVersion.height_px
                ? { width: currentVersion.width_px, height: currentVersion.height_px }
                : null,
            checksum: {
              algorithm: currentVersion.checksum_algorithm,
              value: currentVersion.checksum,
            },
            providerReference: input.exposeProviderReference
              ? { visibility: "opaque", token: currentVersion.provider_ref }
              : { visibility: "redacted" },
            operations: ["metadata"],
            provenance: {
              authority: "provider",
              source: currentVersion.provider_kind,
              observedAt: currentVersion.updated_at,
              canonical: true,
            },
          }
        : null;

      const derivatives = registry.runtimeDerivatives
        .filter((item) => item.asset_id === asset.semantic_id)
        .map<StudioRuntimeDerivativeSummary>((item) => {
          const accepted =
            manifestById.get(asset.semantic_id) ?? manifestById.get(item.semantic_id) ?? null;
          if (!accepted && ["RUNTIME READY", "PUBLISHED"].includes(currentVersion?.lifecycle ?? ""))
            assetIssues.push({
              code: "runtime-mapping-missing",
              severity: "blocking",
              message:
                "Registry state indicates runtime readiness but Git manifest has no accepted mapping.",
              source: "runtime-manifest",
            });
          if (accepted && item.runtime_path && accepted.path !== item.runtime_path)
            assetIssues.push({
              code: "runtime-derivative-mismatch",
              severity: "warning",
              message: `Registry runtime path ${item.runtime_path} differs from accepted manifest path ${accepted.path}.`,
              source: "runtime-manifest",
            });
          return {
            semanticId: item.semantic_id,
            assetId: item.asset_id,
            mediaType: item.media_type,
            outputFormat: item.output_format,
            runtimePath: item.runtime_path,
            technicalState: item.technical_state,
            manifestMapped: Boolean(accepted),
            acceptedRuntimePath: accepted?.path ?? null,
          };
        });

      return {
        semanticId: asset.semantic_id,
        role: asset.role,
        variant: asset.variant,
        lifecycle: currentVersion?.lifecycle ?? null,
        currentVersion: source,
        derivativeRequired: asset.derivative_required,
        runtimeDerivatives: derivatives,
        issues: assetIssues,
      };
    });

  const history = registry.changeEvents
    .filter(
      (item) =>
        item.entity_id === canonical.semanticId ||
        (item.asset_id && assets.some((asset) => asset.semanticId === item.asset_id)),
    )
    .slice(0, 20)
    .map<StudioHistorySummary>((item) => ({
      eventType: item.event_type,
      occurredAt: item.occurred_at,
      sourceKind: item.source_kind,
    }));

  const provenance: StudioProvenance[] = [
    canonical.provenance,
    {
      authority: "registry",
      source: "studio_registry",
      observedAt: registry.observedAt,
      canonical: false,
    },
    {
      authority: "runtime-manifest",
      source: runtimeManifest.path,
      revision: runtimeManifest.revision,
      canonical: true,
    },
  ];
  if (canonical.preview) provenance.push(canonical.preview.provenance);

  return {
    readModelVersion: STUDIO_READ_MODEL_VERSION,
    semanticId: canonical.semanticId,
    entityType: canonical.entityType,
    displayName: canonical.displayName,
    canonical,
    lifecycle: entity?.lifecycle ?? null,
    schemaVersion: entity?.schema_version ?? null,
    validations: entityValidations,
    relations,
    assets,
    history,
    permissions,
    provenance,
    issues: [...issues, ...assets.flatMap((asset) => asset.issues)],
  };
}

export function toCollectionRow(model: StudioEntityReadModel): StudioCollectionRow {
  return {
    semanticId: model.semanticId,
    entityType: model.entityType,
    displayName: model.displayName,
    lifecycle: model.lifecycle,
    readiness: readinessFor(model.validations, model.issues),
    issueCount: model.issues.length,
    canonicalPath: model.canonical.canonicalPath,
  };
}

export function searchStudioEntities(
  models: readonly StudioEntityReadModel[],
  query: StudioSearchQuery,
): StudioSearchResult {
  const text = query.text?.trim().toLocaleLowerCase() ?? "";
  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.min(100, Math.max(1, query.limit ?? 50));
  const filtered = models
    .map(toCollectionRow)
    .filter(
      (row) =>
        !text ||
        row.semanticId.toLocaleLowerCase().includes(text) ||
        row.displayName.toLocaleLowerCase().includes(text),
    )
    .filter((row) => !query.entityType || row.entityType === query.entityType)
    .filter((row) => !query.lifecycle || row.lifecycle === query.lifecycle)
    .filter((row) => !query.readiness || row.readiness === query.readiness)
    .sort(
      (a, b) =>
        a.entityType.localeCompare(b.entityType) || a.semanticId.localeCompare(b.semanticId),
    );
  return { total: filtered.length, offset, limit, rows: filtered.slice(offset, offset + limit) };
}
