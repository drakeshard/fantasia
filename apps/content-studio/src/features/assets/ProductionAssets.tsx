import { useEffect, useMemo, useState } from "preact/hooks";
import type { StudioReadModelsResponse } from "../../dashboard-model";
import type { StoredStudioAuthSession } from "../../studio-session";
import { Button, Dialog, SelectField, StateMessage, TextField } from "../../ui/primitives";
import {
  EmptyState,
  FilePicker,
  FilterBar,
  KeyValueList,
  MasterDetailLayout,
  MetadataRow,
  Section,
  SelectableCollection,
  SelectableRow,
  StatusGroup,
} from "../../ui/production-components";
import { CollectionTemplate, TemplateFixtureHeading, TemplateToolbar } from "../../ui/workspace";
import "../../styles/production-assets-populated.css";
import "../../styles/production-assets-dialog.css";
import {
  beginGoogleDriveConnection,
  fetchAssetSourceBlob,
  getGoogleDriveConnectionStatus,
  selectAssetVersion,
  setAssetRelation,
  uploadDriveAssetSource,
  type GoogleDriveConnectionStatus,
} from "./api";
import {
  identityUiAssetRoles,
  identityUiOwnersForRole,
  identityUiRoleLabel,
  identityUiRoleOptions,
} from "./identity-ui-catalog";
import { assetOwnerOptions, productionAssets, type ProductionAsset } from "./model";

const lifecycleOptions = [
  "WORKING",
  "CANDIDATE",
  "IN REVIEW",
  "APPROVED",
  "FROZEN",
  "RUNTIME READY",
  "PUBLISHED",
  "RETIRED",
] as const;

type AssetDetailTab = "versions" | "runtime" | "relations" | "validation";

function unique(values: readonly (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function semanticAssetId(ownerSemanticId: string, role: string, variant: string): string {
  return ["asset", ownerSemanticId, role, variant || "base"]
    .map((segment) =>
      segment
        .trim()
        .toLocaleLowerCase()
        .replace(/[^a-z0-9.-]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean)
    .join(".");
}

function formatBytes(value: number | null): string {
  if (value === null) return "Not registered";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

function versionLabel(asset: ProductionAsset): string {
  const version = asset.currentVersion;
  if (!version) return "No current version";
  return version.versionNumber !== null ? `v${version.versionNumber}` : (version.versionId ?? "Current");
}

function GoogleDriveConnection({ auth, canManage }: { auth: StoredStudioAuthSession; canManage: boolean }) {
  const [status, setStatus] = useState<GoogleDriveConnectionStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getGoogleDriveConnectionStatus(auth)
      .then((result) => {
        if (active) setStatus(result);
      })
      .catch((error) => {
        if (active) setMessage(error instanceof Error ? error.message : "Google Drive status is unavailable.");
      });
    return () => {
      active = false;
    };
  }, [auth.accessToken]);

  async function connect() {
    if (!canManage || pending) return;
    setPending(true);
    setMessage(null);
    try {
      const result = await beginGoogleDriveConnection(auth);
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Google Drive connection could not start.");
      setPending(false);
    }
  }

  return (
    <Section
      title={status?.connected ? `Google Drive · Connected as ${status.accountEmail ?? "connected account"}` : "Google Drive · Not connected"}
      description="Source/master provider connection. Provider identity never becomes semantic asset identity."
      actions={
        canManage ? (
          <Button variant="secondary" pending={pending} onClick={() => void connect()}>
            {status?.connected ? "Reconnect" : "Connect Google Drive"}
          </Button>
        ) : undefined
      }
    >
      {message ? <StateMessage title="Google Drive">{message}</StateMessage> : <span class="studio-assets-provider-note">Trusted provider boundary</span>}
    </Section>
  );
}

function SourceMutationForm({
  selected,
  response,
  auth,
  readOnly,
  compact = false,
  onCompleted,
}: {
  selected: ProductionAsset | null;
  response: StudioReadModelsResponse;
  auth: StoredStudioAuthSession;
  readOnly: boolean;
  compact?: boolean;
  onCompleted: () => Promise<void>;
}) {
  const canonicalOwners = assetOwnerOptions(response);
  const creating = selected === null;
  const initialRole = selected?.role ?? "";
  const [role, setRole] = useState(initialRole);
  const [ownerSemanticId, setOwnerSemanticId] = useState(selected?.ownerSemanticId ?? "");
  const [variant, setVariant] = useState(selected?.variant ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const owners = selected
    ? canonicalOwners.filter((owner) => owner.semanticId === selected.ownerSemanticId)
    : role
      ? identityUiOwnersForRole(role, canonicalOwners)
      : [];
  const roleOptions = selected
    ? unique([selected.role, ...identityUiAssetRoles.map((item) => item.id)]).map((value) => ({ value, label: identityUiRoleLabel(value) }))
    : [{ value: "", label: "Choose asset type", disabled: true }, ...identityUiRoleOptions()];
  const ownerOptions = selected
    ? owners.map((owner) => ({ value: owner.semanticId, label: owner.displayName }))
    : [
        { value: "", label: role ? "Choose owner" : "Choose asset type first", disabled: true },
        ...owners.map((owner) => ({ value: owner.semanticId, label: owner.displayName })),
      ];
  const selectedOwner = canonicalOwners.find((owner) => owner.semanticId === ownerSemanticId) ?? null;
  const assetSemanticId = selected?.semanticId ?? semanticAssetId(ownerSemanticId, role, variant);
  const canSubmit = Boolean(ownerSemanticId && role.trim() && file && assetSemanticId);

  function chooseRole(nextRole: string) {
    setRole(nextRole);
    setOwnerSemanticId("");
    setResult(null);
  }

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    setResult(null);
  }

  async function submit() {
    if (readOnly || !canSubmit || pending || !file) return;
    setPending(true);
    setResult(null);
    try {
      await uploadDriveAssetSource(auth, {
        ownerSemanticId,
        assetSemanticId,
        role: role.trim(),
        variant: variant.trim() || null,
        derivativeRequired: selected?.derivativeRequired ?? false,
        file,
      });
      setFile(null);
      await onCompleted();
      if (selected) setResult({ kind: "success", message: "A new retained source/master version was created and made current." });
    } catch (error) {
      setResult({ kind: "error", message: error instanceof Error ? error.message : "Asset upload failed." });
    } finally {
      setPending(false);
    }
  }

  const filePicker = (
    <FilePicker
      id="asset-source-file"
      label="Source/master file"
      value={file}
      disabled={readOnly}
      hint="The trusted Studio backend uploads the selected file to the connected provider."
      onChange={chooseFile}
    />
  );

  const content = creating ? (
    <div class="studio-assets-create-flow">
      <Section title="Define asset identity" description="Choose the controlled type first. Studio then exposes only valid canonical owners.">
        {roleOptions.length === 1 ? (
          <EmptyState tone="unavailable" title="No controlled asset types available">
            Identity/UI asset registration requires a Git-controlled asset type catalog.
          </EmptyState>
        ) : (
          <div class="studio-assets-create-identity-grid">
            <SelectField id="asset-role" label="Asset type" value={role} disabled={readOnly} data-autofocus onChange={(event) => chooseRole(event.currentTarget.value)} options={roleOptions} />
            <SelectField id="asset-owner" label="Owner" value={ownerSemanticId} disabled={readOnly || !role || owners.length === 0} onChange={(event) => { setOwnerSemanticId(event.currentTarget.value); setResult(null); }} options={ownerOptions} />
            <TextField id="asset-variant" label="Variant · optional" value={variant} disabled={readOnly} onInput={(event) => setVariant(event.currentTarget.value)} placeholder="Leave blank for base" hint="Use only for a meaningful alternate of the same asset role." />
          </div>
        )}
        {role && owners.length === 0 ? (
          <EmptyState tone="unavailable" title="No canonical owners for this asset type">
            This controlled asset type has no canonical owners in the deployed Studio snapshot.
          </EmptyState>
        ) : null}
        {role && selectedOwner ? (
          <MetadataRow
            label="Will register as"
            primary={`${selectedOwner.displayName} · ${identityUiRoleLabel(role)}${variant.trim() ? ` · ${variant.trim()}` : " · base"}`}
            secondary={<code>{assetSemanticId}</code>}
          />
        ) : null}
      </Section>
      <Section title="Select source/master" description="Attach the source/master after the semantic identity is controlled.">
        {filePicker}
      </Section>
      <div class="studio-assets-create-footer">
        <div><span>Registration</span><strong>{canSubmit ? "Ready to add asset" : "Complete identity and source"}</strong></div>
        <Button variant="primary" pending={pending} disabled={readOnly || !canSubmit} onClick={() => void submit()}>Add Asset</Button>
      </div>
      {result ? <StateMessage title="Upload failed" tone="error">{result.message}</StateMessage> : null}
    </div>
  ) : (
    <div class="studio-assets-create-form">
      {!compact ? <p>A replacement creates a new retained WORKING version. Approval, freeze, publication and runtime readiness remain unchanged.</p> : null}
      {filePicker}
      <MetadataRow
        label="Replacing source for"
        primary={`${selectedOwner?.displayName ?? selected.ownerDisplayName} · ${identityUiRoleLabel(role)}${variant.trim() ? ` · ${variant.trim()}` : " · base"}`}
        secondary={<code>{assetSemanticId}</code>}
      />
      <StatusGroup label="Replacement actions">
        <Button variant="primary" pending={pending} disabled={readOnly || !canSubmit} onClick={() => void submit()}>Upload new version</Button>
      </StatusGroup>
      {result ? <StateMessage title={result.kind === "success" ? "Upload complete" : "Upload failed"} tone={result.kind === "error" ? "error" : "neutral"}>{result.message}</StateMessage> : null}
    </div>
  );

  return content;
}

function VersionOperations({ asset, auth, readOnly, onCompleted }: { asset: ProductionAsset; auth: StoredStudioAuthSession; readOnly: boolean; onCompleted: () => Promise<void> }) {
  const [pendingVersion, setPendingVersion] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function choose(versionId: string) {
    if (readOnly || pendingVersion) return;
    setPendingVersion(versionId);
    setMessage(null);
    try {
      await selectAssetVersion(auth, asset.semanticId, versionId);
      setMessage("Retained version selected as current. Version lifecycle/approval was not changed.");
      await onCompleted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Version selection failed.");
    } finally {
      setPendingVersion(null);
    }
  }

  async function access(versionId: string, disposition: "preview" | "download") {
    try {
      const blob = await fetchAssetSourceBlob(auth, versionId, disposition);
      const url = URL.createObjectURL(blob);
      if (disposition === "preview") window.open(url, "_blank", "noopener,noreferrer");
      else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${asset.semanticId}-source`;
        anchor.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Source access failed.");
    }
  }

  return (
    <Section title="Source access & current selection" description="Retained versions remain independent from lifecycle approval.">
      <div class="studio-assets-version-actions">
        {asset.versionRecords.map((version) => (
          <MetadataRow
            key={version.versionId}
            label={`v${version.versionNumber}${version.current ? " · current" : ""}`}
            primary={version.lifecycle}
            secondary={version.createdAt ?? "Timestamp unavailable"}
            trailing={
              <StatusGroup label={`Actions for v${version.versionNumber}`}>
                <Button variant="quiet" onClick={() => void access(version.versionId, "preview")}>Preview</Button>
                <Button variant="quiet" onClick={() => void access(version.versionId, "download")}>Download</Button>
                {!version.current ? (
                  <Button variant="secondary" pending={pendingVersion === version.versionId} disabled={readOnly || pendingVersion !== null} onClick={() => void choose(version.versionId)}>Make current</Button>
                ) : null}
              </StatusGroup>
            }
          />
        ))}
      </div>
      {message ? <StateMessage title="Version operation">{message}</StateMessage> : null}
    </Section>
  );
}

function RelationOperations({ asset, allAssets, auth, readOnly, onCompleted }: { asset: ProductionAsset; allAssets: readonly ProductionAsset[]; auth: StoredStudioAuthSession; readOnly: boolean; onCompleted: () => Promise<void> }) {
  const targets = allAssets.filter((candidate) => candidate.semanticId !== asset.semanticId);
  const [relationType, setRelationType] = useState("related-to");
  const [targetAssetId, setTargetAssetId] = useState(targets[0]?.semanticId ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function set(active: boolean, target = targetAssetId, type = relationType) {
    if (readOnly || pending || !target || !type.trim()) return;
    setPending(true);
    setMessage(null);
    try {
      await setAssetRelation(auth, { sourceAssetId: asset.semanticId, relationType: type.trim(), targetAssetId: target, active });
      setMessage(active ? "Asset relation registered." : "Asset relation removed.");
      await onCompleted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Asset relation operation failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Section title="Asset-to-asset relations" description="Relations use semantic IDs; provider folders and filenames are not relation authority.">
      {targets.length > 0 ? (
        <div class="studio-assets-form-grid">
          <TextField id="asset-relation-type" label="Relation type" value={relationType} disabled={readOnly} onInput={(event) => setRelationType(event.currentTarget.value)} />
          <SelectField id="asset-relation-target" label="Target semantic asset" value={targetAssetId} disabled={readOnly} onChange={(event) => setTargetAssetId(event.currentTarget.value)} options={targets.map((target) => ({ value: target.semanticId, label: target.semanticId }))} />
          <Button variant="secondary" pending={pending} disabled={readOnly || !targetAssetId} onClick={() => void set(true)}>Add relation</Button>
        </div>
      ) : <EmptyState title="No relation targets yet">Register another semantic asset before adding asset-to-asset relations.</EmptyState>}
      {asset.relations?.map((relation) => (
        <MetadataRow key={`${relation.type}:${relation.targetSemanticId}`} primary={`${relation.type} → ${relation.targetSemanticId}`} trailing={<Button variant="quiet" disabled={readOnly || pending} onClick={() => void set(false, relation.targetSemanticId, relation.type)}>Remove</Button>} />
      ))}
      {message ? <StateMessage title="Relation operation">{message}</StateMessage> : null}
    </Section>
  );
}

function TrustedAssetPreview({ asset, auth }: { asset: ProductionAsset; auth: StoredStudioAuthSession }) {
  const version = asset.currentVersion;
  const versionId = version?.versionId ?? null;
  const previewAvailable = version?.operations?.includes("preview") ?? false;
  const imagePreview = previewAvailable && Boolean(version?.mediaType?.startsWith("image/"));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setPreviewUrl(null);
    setPreviewState(imagePreview && versionId ? "loading" : "idle");
    if (!imagePreview || !versionId) return () => undefined;
    void fetchAssetSourceBlob(auth, versionId, "preview")
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
        setPreviewState("idle");
      })
      .catch(() => {
        if (active) setPreviewState("error");
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [auth.accessToken, asset.semanticId, imagePreview, versionId]);

  return (
    <div class="studio-assets-preview-live" data-testid="asset-live-preview">
      {previewUrl ? (
        <img class="studio-assets-preview-live__image" src={previewUrl} alt={`${asset.ownerDisplayName} ${identityUiRoleLabel(asset.role)} source preview`} />
      ) : (
        <div class="studio-assets-preview-live__empty">
          <span aria-hidden="true">◇</span>
          <strong>{previewState === "loading" ? "Loading source preview…" : asset.ownerDisplayName}</strong>
          <span class="studio-assets-preview-live__loading">
            {previewState === "error" ? "The trusted preview could not be rendered inline." : imagePreview ? "Source/master preview from the trusted provider boundary." : "This source type does not expose an inline image preview."}
          </span>
        </div>
      )}
    </div>
  );
}

function RuntimeSummary({ asset }: { asset: ProductionAsset }) {
  if (asset.runtimeDerivatives.length === 0) {
    return <EmptyState tone={asset.derivativeRequired ? "unavailable" : "empty"} title={asset.derivativeRequired ? "Runtime derivative required" : "No runtime derivative"}>Runtime derivative evidence remains separate from source/master approval and lifecycle.</EmptyState>;
  }
  return <div class="studio-assets-runtime-summary">{asset.runtimeDerivatives.map((derivative) => <MetadataRow key={derivative.semanticId} primary={derivative.semanticId} secondary={`${derivative.outputFormat} · ${derivative.mediaType}`} trailing={<span class="studio-assets-state-pill">{derivative.technicalState}</span>} />)}</div>;
}

function RelationsSummary({ asset }: { asset: ProductionAsset }) {
  const relations = asset.relations ?? [];
  if (relations.length === 0) return <EmptyState title="No registered asset relations">No semantic relations are registered.</EmptyState>;
  return <div class="studio-assets-relations-summary">{relations.map((relation) => <MetadataRow key={`${relation.type}:${relation.targetSemanticId}`} label={relation.type} primary={relation.targetLabel ?? relation.targetSemanticId} />)}</div>;
}

function ValidationSummary({ asset }: { asset: ProductionAsset }) {
  if (asset.issues.length === 0 && asset.validations.length === 0) return <EmptyState title="No registered asset issues">No validation/source issues are registered.</EmptyState>;
  return (
    <div class="studio-assets-validation-summary">
      {asset.validations.map((validation, index) => <MetadataRow key={`${validation.dimension}:${index}`} label={validation.dimension} primary={validation.outcome} secondary={validation.checkedAt ?? "Check time unavailable"} trailing={validation.blocking ? <span class="studio-assets-state-pill studio-assets-state-pill--blocked">blocking</span> : undefined} />)}
      {asset.issues.map((issue, index) => <MetadataRow key={`${issue.code ?? "issue"}:${index}`} label={issue.code ?? "Asset issue"} primary={issue.message} trailing={<span class="studio-assets-state-pill studio-assets-state-pill--warning">{issue.severity}</span>} />)}
    </div>
  );
}

function SelectedAssetWorkspace({ asset, allAssets, auth, response, readOnly, onCompleted }: { asset: ProductionAsset; allAssets: readonly ProductionAsset[]; auth: StoredStudioAuthSession; response: StudioReadModelsResponse; readOnly: boolean; onCompleted: () => Promise<void> }) {
  const [detail, setDetail] = useState<AssetDetailTab>("versions");
  const [replacing, setReplacing] = useState(false);
  const [relating, setRelating] = useState(false);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);
  const version = asset.currentVersion;
  const currentVersionId = version?.versionId ?? null;

  async function sourceAccess(disposition: "preview" | "download") {
    if (!currentVersionId) return;
    setSourceMessage(null);
    try {
      const blob = await fetchAssetSourceBlob(auth, currentVersionId, disposition);
      const url = URL.createObjectURL(blob);
      if (disposition === "preview") window.open(url, "_blank", "noopener,noreferrer");
      else {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${asset.semanticId}-source`;
        anchor.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) {
      setSourceMessage(error instanceof Error ? error.message : "Source access failed.");
    }
  }

  return (
    <article class="studio-assets-focus" aria-label={`Selected asset ${asset.semanticId}`}>
      <header class="studio-assets-focus__header">
        <div class="studio-assets-focus__identity">
          <span class="studio-assets-focus__eyebrow">{identityUiRoleLabel(asset.role)}{asset.variant ? ` · ${asset.variant}` : ""}</span>
          <h3>{asset.ownerDisplayName}</h3>
          <code>{asset.semanticId}</code>
        </div>
        <StatusGroup label="Selected asset status">
          <span class="studio-assets-state-pill">{asset.lifecycle ?? "Lifecycle unavailable"}</span>
          <span class={`studio-assets-state-pill studio-assets-state-pill--${asset.readiness}`}>{asset.readiness}</span>
        </StatusGroup>
      </header>

      <div class="studio-assets-focus__hero">
        <TrustedAssetPreview key={`preview:${asset.semanticId}:${currentVersionId ?? "none"}`} asset={asset} auth={auth} />
        <Section title="Current source/master" description={versionLabel(asset)}>
          <KeyValueList
            label="Current source/master facts"
            items={[
              { label: "Source", value: version?.sourceAvailable ? "Available" : "Unavailable" },
              { label: "Media", value: version?.mediaType ?? "Not registered" },
              { label: "Dimensions", value: version?.dimensions ? `${version.dimensions.width} × ${version.dimensions.height}` : "Not registered" },
              { label: "Size", value: formatBytes(version?.byteSize ?? null) },
              { label: "Versions", value: asset.versionRecords.length },
              { label: "Runtime", value: asset.runtimeDerivatives.length },
            ]}
          />
          <MetadataRow label="Provider" primary={version?.providerKind ?? "Not registered"} secondary={version?.checksum ? <code>{`${version.checksum.algorithm}:${version.checksum.value}`}</code> : "Checksum not registered"} />
          <StatusGroup label="Source actions">
            {version?.operations?.includes("preview") ? <Button variant="secondary" onClick={() => void sourceAccess("preview")}>Open preview</Button> : null}
            {version?.operations?.includes("download") ? <Button variant="quiet" onClick={() => void sourceAccess("download")}>Download source</Button> : null}
            {!readOnly ? <Button variant="primary" onClick={() => setReplacing(true)}>Replace source</Button> : null}
          </StatusGroup>
          {sourceMessage ? <StateMessage title="Source access">{sourceMessage}</StateMessage> : null}
        </Section>
      </div>

      <Section title="Selected asset details">
        <StatusGroup label="Selected asset detail tabs">
          {([
            ["versions", `Versions · ${asset.versionRecords.length}`],
            ["runtime", `Runtime · ${asset.runtimeDerivatives.length}`],
            ["relations", `Relations · ${asset.relations?.length ?? 0}`],
            ["validation", `Validation · ${asset.issues.length}`],
          ] as const).map(([value, label]) => (
            <Button key={value} variant={detail === value ? "secondary" : "quiet"} aria-pressed={detail === value} onClick={() => setDetail(value)}>{label}</Button>
          ))}
          {!readOnly ? <Button variant="quiet" onClick={() => setRelating(true)}>Manage relations</Button> : null}
        </StatusGroup>
        <div class="studio-assets-details__body">
          {detail === "versions" ? <VersionOperations key={`versions:${asset.semanticId}`} asset={asset} auth={auth} readOnly={readOnly} onCompleted={onCompleted} /> : null}
          {detail === "runtime" ? <RuntimeSummary asset={asset} /> : null}
          {detail === "relations" ? <RelationsSummary asset={asset} /> : null}
          {detail === "validation" ? <ValidationSummary asset={asset} /> : null}
        </div>
      </Section>

      {replacing ? (
        <Dialog id="replace-asset-source-dialog" open onOpenChange={setReplacing} title="Replace source/master" description="Upload a new retained WORKING version for this semantic asset. Lifecycle approval and runtime readiness do not change.">
          <SourceMutationForm key={`replace:${asset.semanticId}`} selected={asset} response={response} auth={auth} readOnly={readOnly} compact onCompleted={async () => { await onCompleted(); setReplacing(false); }} />
        </Dialog>
      ) : null}
      {relating ? (
        <Dialog id="asset-relations-dialog" open onOpenChange={setRelating} title="Manage asset relations" description="Register or remove semantic asset-to-asset relations.">
          <RelationOperations key={`relations:${asset.semanticId}`} asset={asset} allAssets={allAssets} auth={auth} readOnly={readOnly} onCompleted={onCompleted} />
        </Dialog>
      ) : null}
    </article>
  );
}

export function ProductionAssets({ response, auth, readOnly, canManageDrive, semanticId, onRefresh }: { response: StudioReadModelsResponse; auth: StoredStudioAuthSession; readOnly: boolean; canManageDrive: boolean; semanticId: string | null; onRefresh: () => Promise<void> }) {
  const allAssets = productionAssets(response);
  const [text, setText] = useState(semanticId ?? "");
  const [owner, setOwner] = useState("all");
  const [role, setRole] = useState("all");
  const [variant, setVariant] = useState("all");
  const [lifecycle, setLifecycle] = useState("all");
  const [readiness, setReadiness] = useState("all");
  const [source, setSource] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(semanticId);
  const [creating, setCreating] = useState(false);

  const owners = unique(allAssets.map((asset) => asset.ownerSemanticId));
  const roles = unique(allAssets.map((asset) => asset.role));
  const variants = unique(allAssets.map((asset) => asset.variant));
  const ownerLabels = new Map(allAssets.map((asset) => [asset.ownerSemanticId, asset.ownerDisplayName] as const));
  const hasActiveFilters = Boolean(text.trim() || owner !== "all" || role !== "all" || variant !== "all" || lifecycle !== "all" || readiness !== "all" || source !== "all");

  const filtered = useMemo(() => {
    const query = text.trim().toLocaleLowerCase();
    return allAssets.filter((asset) => {
      const typeLabel = identityUiRoleLabel(asset.role).toLocaleLowerCase();
      if (query && !asset.semanticId.toLocaleLowerCase().includes(query) && !asset.ownerDisplayName.toLocaleLowerCase().includes(query) && !asset.role.toLocaleLowerCase().includes(query) && !typeLabel.includes(query) && !asset.variant?.toLocaleLowerCase().includes(query)) return false;
      if (owner !== "all" && asset.ownerSemanticId !== owner) return false;
      if (role !== "all" && asset.role !== role) return false;
      if (variant !== "all" && asset.variant !== variant) return false;
      if (lifecycle !== "all" && asset.lifecycle !== lifecycle) return false;
      if (readiness !== "all" && asset.readiness !== readiness) return false;
      if (source === "available" && !asset.currentVersion?.sourceAvailable) return false;
      if (source === "missing" && asset.currentVersion?.sourceAvailable) return false;
      return true;
    });
  }, [allAssets, lifecycle, owner, readiness, role, source, text, variant]);

  const selected = filtered.find((asset) => asset.semanticId === selectedId) ?? filtered[0] ?? null;

  function clearFilters() {
    setText(""); setOwner("all"); setRole("all"); setVariant("all"); setLifecycle("all"); setReadiness("all"); setSource("all");
  }

  const browser = (
    <div class="studio-assets-library" aria-label="Asset browser">
      <div class="studio-assets-library__heading">
        <div><span>Asset library</span><strong>{filtered.length} / {allAssets.length}</strong></div>
        {hasActiveFilters ? <Button variant="quiet" onClick={clearFilters}>Clear</Button> : null}
      </div>
      <FilterBar label="Asset filters" activeSummary={hasActiveFilters ? `${filtered.length} of ${allAssets.length} assets` : undefined}>
        <TextField id="assets-search" label="Search assets" type="search" value={text} onInput={(event) => setText(event.currentTarget.value)} placeholder="Owner, type, variant or semantic ID" />
        <SelectField id="assets-role-filter" label="Asset type" value={role} onChange={(event) => setRole(event.currentTarget.value)} options={[{ value: "all", label: "All asset types" }, ...roles.map((value) => ({ value, label: identityUiRoleLabel(value) }))]} />
        <SelectField id="assets-owner-filter" label="Owner" value={owner} onChange={(event) => setOwner(event.currentTarget.value)} options={[{ value: "all", label: "All owners" }, ...owners.map((value) => ({ value, label: ownerLabels.get(value) ?? value }))]} />
        <Button variant="quiet" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>{filtersOpen ? "Hide filters" : "More filters"}</Button>
        {filtersOpen ? (
          <>
            <SelectField id="assets-variant-filter" label="Variant" value={variant} onChange={(event) => setVariant(event.currentTarget.value)} options={[{ value: "all", label: "All variants" }, ...variants.map((value) => ({ value, label: value }))]} />
            <SelectField id="assets-lifecycle-filter" label="Lifecycle" value={lifecycle} onChange={(event) => setLifecycle(event.currentTarget.value)} options={[{ value: "all", label: "All lifecycle states" }, ...lifecycleOptions.map((value) => ({ value, label: value }))]} />
            <SelectField id="assets-readiness-filter" label="Readiness" value={readiness} onChange={(event) => setReadiness(event.currentTarget.value)} options={[{ value: "all", label: "All readiness" }, { value: "ready", label: "Ready" }, { value: "warning", label: "Warning" }, { value: "blocked", label: "Blocked" }, { value: "unknown", label: "Unknown" }]} />
            <SelectField id="assets-source-filter" label="Source/master" value={source} onChange={(event) => setSource(event.currentTarget.value)} options={[{ value: "all", label: "All source states" }, { value: "available", label: "Source available" }, { value: "missing", label: "Source missing" }]} />
          </>
        ) : null}
      </FilterBar>
      {filtered.length === 0 ? (
        <EmptyState title="No matching assets" action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}>Adjust the browser filters or return to the full library.</EmptyState>
      ) : (
        <div class="studio-assets-selector studio-assets-selector--rail">
          <SelectableCollection label="Semantic assets">
            {filtered.map((asset) => (
              <SelectableRow
                key={asset.semanticId}
                selected={selected?.semanticId === asset.semanticId}
                title={asset.ownerDisplayName}
                metadata={<>{identityUiRoleLabel(asset.role)}{asset.variant ? ` · ${asset.variant}` : ""}<br /><code>{asset.semanticId}</code></>}
                status={<StatusGroup label={`Asset status for ${asset.ownerDisplayName}`}><span>{versionLabel(asset)}</span><span>{asset.readiness}</span><span>{asset.currentVersion?.sourceAvailable ? "Source ready" : "Source missing"}</span></StatusGroup>}
                onClick={() => setSelectedId(asset.semanticId)}
              />
            ))}
          </SelectableCollection>
        </div>
      )}
    </div>
  );

  return (
    <CollectionTemplate
      className="studio-assets-workspace"
      header={<TemplateFixtureHeading title="Assets" description="Browse source/master assets, retained versions, relations and runtime evidence." />}
      toolbar={<TemplateToolbar><span>{allAssets.length} semantic asset{allAssets.length === 1 ? "" : "s"}</span>{!readOnly ? <Button variant="primary" onClick={() => setCreating(true)}>+ Add Asset</Button> : null}<span>{readOnly ? "Viewer · read-only" : "Trusted source operations enabled"}</span></TemplateToolbar>}
    >
      <GoogleDriveConnection auth={auth} canManage={canManageDrive} />
      {allAssets.length === 0 ? (
        <EmptyState title="No assets yet" action={!readOnly ? <Button variant="primary" onClick={() => setCreating(true)}>Add first asset</Button> : undefined}>Upload the first source/master when you are ready.</EmptyState>
      ) : (
        <div class="studio-assets-populated">
          <MasterDetailLayout
            masterLabel="Asset browser"
            master={browser}
            detail={selected ? <SelectedAssetWorkspace key={selected.semanticId} asset={selected} allAssets={allAssets} auth={auth} response={response} readOnly={readOnly} onCompleted={onRefresh} /> : <EmptyState title="No asset selected">Clear or adjust the browser filters to inspect an asset.</EmptyState>}
          />
        </div>
      )}

      {creating ? (
        <Dialog id="add-asset-dialog" open onOpenChange={setCreating} title="Add Asset" description="Define the controlled asset identity, then attach its source/master. Studio derives the semantic ID and trusted Google Drive destination.">
          <SourceMutationForm selected={null} response={response} auth={auth} readOnly={readOnly} compact onCompleted={async () => { await onRefresh(); setCreating(false); }} />
        </Dialog>
      ) : null}

      {readOnly ? <StateMessage title="Read-only Assets workspace" tone="unavailable">Your Studio role can inspect semantic assets, retained versions, validation and runtime evidence but cannot register, replace, restore or relate sources.</StateMessage> : null}
    </CollectionTemplate>
  );
}
