import type { StudioReadModelsResponse } from "../../dashboard-model";
import type { AssetBoardRecord } from "../../ui/asset-board";

export type AssetReadiness = "ready" | "warning" | "blocked" | "unknown";

export type ProductionAssetVersion = {
  readonly versionId: string;
  readonly versionNumber: number;
  readonly lifecycle: string;
  readonly current: boolean;
  readonly createdAt: string | null;
  readonly source: NonNullable<AssetBoardRecord["currentVersion"]>;
  readonly validations: readonly {
    readonly dimension: string;
    readonly outcome: string;
    readonly blocking: boolean;
    readonly checkedAt?: string;
  }[];
};

export type ProductionAsset = AssetBoardRecord & {
  readonly ownerSemanticId: string;
  readonly ownerEntityType: string | null;
  readonly ownerDisplayName: string;
  readonly readiness: AssetReadiness;
  readonly versionRecords: readonly ProductionAssetVersion[];
  readonly validations: readonly {
    readonly dimension: string;
    readonly outcome: string;
    readonly blocking: boolean;
    readonly checkedAt?: string;
  }[];
  readonly history: readonly {
    readonly eventType: string;
    readonly occurredAt: string;
    readonly sourceKind: string | null;
  }[];
};

type AssetsResponse = StudioReadModelsResponse & {
  readonly assets?: readonly {
    readonly semanticId: string;
    readonly ownerSemanticId: string;
    readonly ownerEntityType: string | null;
    readonly ownerDisplayName: string;
    readonly role: string;
    readonly variant: string | null;
    readonly lifecycle: string | null;
    readonly readiness: AssetReadiness;
    readonly currentVersion: AssetBoardRecord["currentVersion"];
    readonly derivativeRequired: boolean;
    readonly versions: readonly ProductionAssetVersion[];
    readonly relations: readonly {
      readonly type: string;
      readonly targetSemanticId: string;
      readonly targetLabel: string;
      readonly valid: boolean;
    }[];
    readonly validations: ProductionAsset["validations"];
    readonly runtimeDerivatives: AssetBoardRecord["runtimeDerivatives"];
    readonly history: ProductionAsset["history"];
    readonly issues: AssetBoardRecord["issues"];
  }[];
};

export type AssetOwnerOption = {
  readonly semanticId: string;
  readonly displayName: string;
  readonly entityType: string;
};

export function productionAssets(response: StudioReadModelsResponse): readonly ProductionAsset[] {
  const assets = (response as AssetsResponse).assets ?? [];
  return assets.map((asset) => ({
    semanticId: asset.semanticId,
    ownerSemanticId: asset.ownerSemanticId,
    ownerEntityType: asset.ownerEntityType,
    ownerDisplayName: asset.ownerDisplayName,
    role: asset.role,
    variant: asset.variant,
    lifecycle: asset.lifecycle,
    readiness: asset.readiness,
    currentVersion: asset.currentVersion,
    derivativeRequired: asset.derivativeRequired,
    runtimeDerivatives: asset.runtimeDerivatives,
    issues: asset.issues,
    relations: asset.relations,
    versions: asset.versions.map((version) => ({
      versionId: version.versionId,
      versionNumber: version.versionNumber,
      lifecycle: version.lifecycle,
      current: version.current,
      createdAt: version.createdAt ?? undefined,
      summary: version.current
        ? "Current source/master version."
        : "Retained historical source/master version.",
    })),
    versionRecords: asset.versions,
    validations: asset.validations,
    history: asset.history,
  }));
}

export function assetOwnerOptions(response: StudioReadModelsResponse): readonly AssetOwnerOption[] {
  return response.models
    .filter((model) => model.canonical?.canonicalPath && model.canonical.canonicalPath !== "[missing]")
    .map((model) => ({
      semanticId: model.semanticId,
      displayName: model.displayName,
      entityType: model.entityType,
    }))
    .sort((a, b) => a.entityType.localeCompare(b.entityType) || a.displayName.localeCompare(b.displayName));
}
