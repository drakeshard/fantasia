import { useState } from "preact/hooks";
import { Button, StateMessage, Surface } from "./primitives";
import { LifecycleBadge, RelationCard, ValidationBadge, VersionBadge } from "./semantic";
import { lifecycleStateFromRegistry } from "./semantic-model";

export type AssetProviderReference = {
  readonly visibility: "redacted" | "opaque" | "unavailable";
  readonly token?: string;
};

export type AssetSourceVersion = {
  readonly semanticAssetId?: string;
  readonly versionId: string | null;
  readonly versionNumber: number | null;
  readonly providerKind: string | null;
  readonly sourceAvailable: boolean;
  readonly mediaType: string | null;
  readonly byteSize: number | null;
  readonly dimensions: { readonly width: number; readonly height: number } | null;
  readonly checksum: { readonly algorithm: string; readonly value: string } | null;
  readonly providerReference: AssetProviderReference;
  readonly operations?: readonly ("metadata" | "preview" | "download")[];
  readonly provenance: {
    readonly authority?: string;
    readonly source?: string;
    readonly observedAt?: string;
  };
};

export type AssetRuntimeDerivative = {
  readonly semanticId: string;
  readonly assetId?: string;
  readonly mediaType: string;
  readonly outputFormat: string;
  readonly runtimePath: string | null;
  readonly technicalState: string;
  readonly manifestMapped: boolean;
  readonly acceptedRuntimePath: string | null;
};

export type AssetIssue = {
  readonly code?: string;
  readonly severity: string;
  readonly message: string;
};

export type AssetRelation = {
  readonly type: string;
  readonly targetSemanticId: string;
  readonly targetLabel?: string;
};

export type AssetVersionHistoryRecord = {
  readonly versionId: string;
  readonly versionNumber: number | null;
  readonly lifecycle: string | null;
  readonly current: boolean;
  readonly createdAt?: string;
  readonly summary?: string;
};

export type AssetBoardRecord = {
  readonly semanticId: string;
  readonly role: string;
  readonly variant: string | null;
  readonly lifecycle: string | null;
  readonly currentVersion: AssetSourceVersion | null;
  readonly derivativeRequired: boolean;
  readonly runtimeDerivatives: readonly AssetRuntimeDerivative[];
  readonly issues: readonly AssetIssue[];
  readonly relations?: readonly AssetRelation[];
  readonly versions?: readonly AssetVersionHistoryRecord[];
};

export type AssetBoardAvailability = "ready" | "loading" | "error" | "unavailable";

function versionLabel(version: Pick<AssetSourceVersion, "versionId" | "versionNumber">): string {
  if (version.versionNumber !== null) return `v${version.versionNumber}`;
  return version.versionId ?? "Current version";
}

function sourceState(asset: AssetBoardRecord): string {
  if (!asset.currentVersion) return "No current version";
  if (!asset.currentVersion.sourceAvailable) return "Source unavailable";
  if (asset.currentVersion.providerReference.visibility === "redacted") {
    return "Source registered · reference redacted";
  }
  if (asset.currentVersion.providerReference.visibility === "unavailable") {
    return "Source registered · reference unavailable";
  }
  return "Source registered";
}

function formatBytes(value: number | null): string {
  if (value === null) return "Not registered";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

function AssetCard({
  asset,
  selected,
  onSelect,
}: {
  asset: AssetBoardRecord;
  selected: boolean;
  onSelect: () => void;
}) {
  const lifecycle = lifecycleStateFromRegistry(asset.lifecycle);
  return (
    <button
      type="button"
      class="studio-asset-card"
      aria-current={selected ? "true" : undefined}
      onClick={onSelect}
    >
      <span class="studio-asset-card__identity">
        <strong>
          {asset.role}
          {asset.variant ? ` · ${asset.variant}` : ""}
        </strong>
        <code>{asset.semanticId}</code>
      </span>
      <span class="studio-asset-card__state">
        {lifecycle ? <LifecycleBadge state={lifecycle} /> : <span>{asset.lifecycle ?? "Lifecycle unavailable"}</span>}
        <small>{sourceState(asset)}</small>
      </span>
    </button>
  );
}

function AssetSourcePanel({ asset }: { asset: AssetBoardRecord }) {
  const version = asset.currentVersion;
  if (!version) {
    return (
      <StateMessage title="No current asset version" tone="unavailable">
        The registry has not supplied a current source/master version for this semantic asset.
      </StateMessage>
    );
  }
  if (!version.sourceAvailable) {
    return (
      <StateMessage title="Source/master unavailable" tone="unavailable">
        A current version record exists, but its source/master is not available through the current
        trusted read boundary.
      </StateMessage>
    );
  }

  const reference =
    version.providerReference.visibility === "opaque"
      ? (version.providerReference.token ?? "Opaque reference unavailable")
      : version.providerReference.visibility === "redacted"
        ? "Redacted by trusted read boundary"
        : "Provider reference unavailable";
  return (
    <Surface kind="inset" className="studio-asset-source">
      <div class="studio-asset-section-heading">
        <div>
          <span>Source / master</span>
          <strong>{versionLabel(version)}</strong>
        </div>
        <VersionBadge label={versionLabel(version)} current />
      </div>
      <dl class="studio-asset-facts">
        <div>
          <dt>Provider</dt>
          <dd>{version.providerKind ?? "Not registered"}</dd>
        </div>
        <div>
          <dt>Provider reference</dt>
          <dd><code>{reference}</code></dd>
        </div>
        <div>
          <dt>Media type</dt>
          <dd>{version.mediaType ?? "Not registered"}</dd>
        </div>
        <div>
          <dt>Dimensions</dt>
          <dd>
            {version.dimensions
              ? `${version.dimensions.width} × ${version.dimensions.height}`
              : "Not registered"}
          </dd>
        </div>
        <div>
          <dt>Byte size</dt>
          <dd>{formatBytes(version.byteSize)}</dd>
        </div>
        <div>
          <dt>Checksum</dt>
          <dd>
            {version.checksum ? (
              <code>{`${version.checksum.algorithm}:${version.checksum.value}`}</code>
            ) : (
              "Not registered"
            )}
          </dd>
        </div>
      </dl>
      <small class="studio-asset-note">
        {version.provenance.observedAt
          ? `Observed ${version.provenance.observedAt}`
          : "Provider observation time is not registered."}
      </small>
    </Surface>
  );
}

function AssetPreview({ asset }: { asset: AssetBoardRecord }) {
  const previewAvailable = asset.currentVersion?.operations?.includes("preview") ?? false;
  return (
    <Surface kind="inset" className="studio-asset-preview">
      <div class="studio-asset-preview__frame" aria-label={`Preview structure for ${asset.semanticId}`}>
        <span aria-hidden="true">◇</span>
        <strong>{asset.role}</strong>
        <code>{asset.semanticId}</code>
        <small>
          {previewAvailable
            ? "Preview operation is available through the trusted provider boundary."
            : "Preview bytes are not exposed by the current read model."}
        </small>
      </div>
    </Surface>
  );
}

function AssetVersionHistory({ asset }: { asset: AssetBoardRecord }) {
  const versions = asset.versions ?? [];
  if (versions.length === 0) {
    return (
      <StateMessage title="Version history not included" tone="unavailable">
        The current read model exposes the current version only. Historical versions are not
        inferred or overwritten; the production Assets workspace must read retained registry
        history explicitly.
      </StateMessage>
    );
  }

  return (
    <ol class="studio-asset-version-list" aria-label={`Version history for ${asset.semanticId}`}>
      {versions.map((version) => {
        const lifecycle = lifecycleStateFromRegistry(version.lifecycle);
        const label = version.versionNumber !== null ? `v${version.versionNumber}` : version.versionId;
        return (
          <li class="studio-asset-version-row" key={version.versionId}>
            <div>
              <VersionBadge label={label} current={version.current} />
              {lifecycle ? <LifecycleBadge state={lifecycle} /> : null}
            </div>
            <p>{version.summary ?? "Retained semantic asset version."}</p>
            <small>{version.createdAt ?? "Timestamp unavailable"}</small>
          </li>
        );
      })}
    </ol>
  );
}

function AssetRuntimeEvidence({ asset }: { asset: AssetBoardRecord }) {
  if (asset.runtimeDerivatives.length === 0) {
    return (
      <StateMessage
        title={asset.derivativeRequired ? "Required derivative not registered" : "No runtime derivative"}
        tone={asset.derivativeRequired ? "unavailable" : "neutral"}
      >
        Runtime derivative evidence remains separate from source/master approval and lifecycle.
      </StateMessage>
    );
  }

  return (
    <div class="studio-asset-runtime-list">
      {asset.runtimeDerivatives.map((derivative) => (
        <Surface kind="inset" key={derivative.semanticId}>
          <div class="studio-asset-section-heading">
            <div>
              <span>Runtime derivative</span>
              <strong>{derivative.semanticId}</strong>
            </div>
            <span>{derivative.technicalState}</span>
          </div>
          <dl class="studio-asset-facts">
            <div><dt>Format</dt><dd>{derivative.outputFormat}</dd></div>
            <div><dt>Media type</dt><dd>{derivative.mediaType}</dd></div>
            <div><dt>Registry runtime path</dt><dd><code>{derivative.runtimePath ?? "Not registered"}</code></dd></div>
            <div><dt>Accepted Git manifest mapping</dt><dd>{derivative.manifestMapped ? "Mapped" : "Not mapped"}</dd></div>
            <div><dt>Accepted runtime path</dt><dd><code>{derivative.acceptedRuntimePath ?? "Not accepted"}</code></dd></div>
          </dl>
        </Surface>
      ))}
    </div>
  );
}

function AssetRelations({ asset }: { asset: AssetBoardRecord }) {
  const relations = asset.relations ?? [];
  if (relations.length === 0) {
    return (
      <StateMessage title="No registered asset relations">
        Usage and source/alternate relations are not inferred from provider folders or filenames.
      </StateMessage>
    );
  }
  return (
    <div class="studio-asset-relation-list">
      {relations.map((relation) => (
        <RelationCard
          key={`${relation.type}:${relation.targetSemanticId}`}
          relationType={relation.type}
          sourceId={asset.semanticId}
          targetId={relation.targetSemanticId}
          targetLabel={relation.targetLabel ?? relation.targetSemanticId}
        />
      ))}
    </div>
  );
}

function AssetIssues({ asset }: { asset: AssetBoardRecord }) {
  if (asset.issues.length === 0) {
    return (
      <StateMessage title="No registered asset issues">
        This only means the current read model supplied no asset issue records.
      </StateMessage>
    );
  }
  return (
    <div class="studio-asset-issue-list">
      {asset.issues.map((issue, index) => (
        <Surface kind="inset" key={`${issue.code ?? "issue"}:${index}`}>
          <ValidationBadge
            state={issue.severity === "blocking" ? "blocking" : issue.severity === "warning" ? "warning" : "unknown"}
          />
          <strong>{issue.code ?? "Asset issue"}</strong>
          <p>{issue.message}</p>
        </Surface>
      ))}
    </div>
  );
}

export function AssetInspector({ asset }: { asset: AssetBoardRecord }) {
  return (
    <section class="studio-asset-inspector" aria-label={`Asset details for ${asset.semanticId}`}>
      <header class="studio-asset-inspector__header">
        <div>
          <span>Semantic asset</span>
          <h4>{asset.role}{asset.variant ? ` · ${asset.variant}` : ""}</h4>
          <code>{asset.semanticId}</code>
        </div>
        <span>{sourceState(asset)}</span>
      </header>
      <div class="studio-asset-inspector__grid">
        <AssetPreview asset={asset} />
        <AssetSourcePanel asset={asset} />
      </div>
      <section class="studio-asset-inspector__section">
        <h5>Version history</h5>
        <AssetVersionHistory asset={asset} />
      </section>
      <section class="studio-asset-inspector__section">
        <h5>Runtime derivatives</h5>
        <AssetRuntimeEvidence asset={asset} />
      </section>
      <section class="studio-asset-inspector__section">
        <h5>Relations / usage</h5>
        <AssetRelations asset={asset} />
      </section>
      <section class="studio-asset-inspector__section">
        <h5>Validation / source issues</h5>
        <AssetIssues asset={asset} />
      </section>
    </section>
  );
}

export function AssetBoard({
  assets,
  availability = "ready",
  readOnly = false,
}: {
  assets: readonly AssetBoardRecord[];
  availability?: AssetBoardAvailability;
  readOnly?: boolean;
}) {
  const [selectedSemanticId, setSelectedSemanticId] = useState<string | null>(null);

  if (availability === "loading") {
    return <StateMessage title="Loading asset board">Waiting for registered asset evidence.</StateMessage>;
  }
  if (availability === "error") {
    return (
      <StateMessage title="Asset board read failed" tone="error">
        Existing source/master and registry records are unchanged.
      </StateMessage>
    );
  }
  if (availability === "unavailable") {
    return (
      <StateMessage title="Asset evidence unavailable" tone="unavailable">
        The current trusted read boundary did not provide asset evidence. This is not an empty
        asset claim.
      </StateMessage>
    );
  }
  if (assets.length === 0) {
    return (
      <StateMessage title="No registered semantic assets">
        No asset records are registered for this entity. Provider folders are not treated as
        semantic asset authority.
      </StateMessage>
    );
  }

  const selected = assets.find((asset) => asset.semanticId === selectedSemanticId) ?? assets[0];
  return (
    <div class="studio-asset-board-composition" data-testid="asset-board-composition">
      {readOnly ? (
        <StateMessage title="Read-only asset board" tone="unavailable">
          Source/master mutation is not available in this workspace.
        </StateMessage>
      ) : null}
      <div class="studio-asset-board-composition__body">
        <nav class="studio-asset-board-composition__list" aria-label="Semantic assets">
          {assets.map((asset) => (
            <AssetCard
              key={asset.semanticId}
              asset={asset}
              selected={selected.semanticId === asset.semanticId}
              onSelect={() => setSelectedSemanticId(asset.semanticId)}
            />
          ))}
        </nav>
        <AssetInspector asset={selected} />
      </div>
    </div>
  );
}
