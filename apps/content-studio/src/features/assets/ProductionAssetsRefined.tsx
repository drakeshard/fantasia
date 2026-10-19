import { useEffect, useMemo, useState } from "preact/hooks";
import type { StudioReadModelsResponse } from "../../dashboard-model";
import type { StoredStudioAuthSession } from "../../studio-session";
import {
  CollectionPanel,
  DetailPanel,
  DetailRow,
  FilePicker,
  FilterBar,
  KeyValue,
  KeyValueList,
  MasterDetailLayout,
  MediaCollectionItem,
  MediaPreview,
  PreviewSummaryLayout,
  SelectableCollection,
  SelectableRow,
  StatusGroup,
  StatusTag,
  UtilityStatus,
  type StatusTone,
} from "../../ui/components";
import { Button, Dialog, SelectField, StateMessage, Surface, TabPanel, Tabs, TextField } from "../../ui/primitives";
import { CollectionTemplate, TemplateFixtureHeading, TemplateToolbar } from "../../ui/workspace";
import "../../styles/production-assets.css";
import "../../styles/production-assets-dialog.css";
import "../../styles/production-assets-refined.css";
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

const lifecycleOptions = ["WORKING", "CANDIDATE", "IN REVIEW", "APPROVED", "FROZEN", "RUNTIME READY", "PUBLISHED", "RETIRED"] as const;
type AssetDetailTab = "versions" | "runtime" | "relations" | "validation";
const detailTabs = [
  { id: "versions", label: "Versions" },
  { id: "runtime", label: "Runtime" },
  { id: "relations", label: "Relations" },
  { id: "validation", label: "Validation" },
] as const;

function unique(values: readonly (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function semanticAssetId(ownerSemanticId: string, role: string, variant: string): string {
  return ["asset", ownerSemanticId, role, variant || "base"]
    .map((segment) => segment.trim().toLocaleLowerCase().replace(/[^a-z0-9.-]+/g, "-").replace(/^-+|-+$/g, ""))
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

function readinessTone(readiness: ProductionAsset["readiness"]): StatusTone {
  if (readiness === "ready") return "success";
  if (readiness === "warning") return "warning";
  if (readiness === "blocked") return "error";
  return "neutral";
}

function mediaMarker(asset: ProductionAsset): string {
  if (asset.currentVersion?.mediaType?.startsWith("image/")) return "IMG";
  if (asset.currentVersion?.mediaType?.startsWith("audio/")) return "AUD";
  if (asset.currentVersion?.mediaType?.startsWith("video/")) return "VID";
  return identityUiRoleLabel(asset.role).replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "AST";
}

function GoogleDriveConnection({ auth, canManage }: { auth: StoredStudioAuthSession; canManage: boolean }) {
  const [status, setStatus] = useState<GoogleDriveConnectionStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getGoogleDriveConnectionStatus(auth)
      .then((result) => { if (active) setStatus(result); })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "Google Drive status is unavailable."); });
    return () => { active = false; };
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

  const connected = status?.connected ?? false;
  return (
    <div class="studio-assets-provider-status">
      <UtilityStatus
        label="Source provider"
        value={status === null && !message ? "Checking Google Drive" : connected ? "Google Drive connected" : "Google Drive unavailable"}
        detail={connected ? (status?.accountEmail ?? "Connected account") : undefined}
        tone={message ? "error" : connected ? "success" : status === null ? "neutral" : "warning"}
        action={canManage ? <Button variant="quiet" pending={pending} onClick={() => void connect()}>{connected ? "Reconnect" : "Connect"}</Button> : undefined}
      />
      {message ? <StateMessage title="Google Drive" tone="error">{message}</StateMessage> : null}
    </div>
  );
}

function SourceMutationForm({ selected, response, auth, readOnly, compact = false, onCompleted }: {
  selected: ProductionAsset | null;
  response: StudioReadModelsResponse;
  auth: StoredStudioAuthSession;
  readOnly: boolean;
  compact?: boolean;
  onCompleted: () => Promise<void>;
}) {
  const canonicalOwners = assetOwnerOptions(response);
  const creating = selected === null;
  const [role, setRole] = useState(selected?.role ?? "");
  const [ownerSemanticId, setOwnerSemanticId] = useState(selected?.ownerSemanticId ?? "");
  const [variant, setVariant] = useState(selected?.variant ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const owners = selected
    ? canonicalOwners.filter((owner) => owner.semanticId === selected.ownerSemanticId)
    : role ? identityUiOwnersForRole(role, canonicalOwners) : [];
  const roleOptions = selected
    ? unique([selected.role, ...identityUiAssetRoles.map((item) => item.id)]).map((value) => ({ value, label: identityUiRoleLabel(value) }))
    : [{ value: "", label: "Choose asset type", disabled: true }, ...identityUiRoleOptions()];
  const ownerOptions = selected
    ? owners.map((owner) => ({ value: owner.semanticId, label: owner.displayName }))
    : [{ value: "", label: role ? "Choose owner" : "Choose asset type first", disabled: true }, ...owners.map((owner) => ({ value: owner.semanticId, label: owner.displayName }))];
  const selectedOwner = canonicalOwners.find((owner) => owner.semanticId === ownerSemanticId) ?? null;
  const assetSemanticId = selected?.semanticId ?? semanticAssetId(ownerSemanticId, role, variant);
  const canSubmit = Boolean(ownerSemanticId && role.trim() && file && assetSemanticId);

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

  const picker = <FilePicker id="asset-source-file" label="Source/master file" file={file} onFileChange={(next) => { setFile(next); setResult(null); }} disabled={readOnly} />;
  const content = creating ? (
    <div class="studio-assets-create-flow">
      <section class="studio-assets-create-section studio-assets-create-section--identity">
        <header class="studio-assets-create-section__heading"><span class="studio-assets-create-section__step">01</span><div><strong>Define asset identity</strong><small>Choose the controlled type first. Studio will then show only valid owners.</small></div></header>
        <div class="studio-assets-create-identity-grid">
          <SelectField id="asset-role" label="Asset type" value={role} disabled={readOnly} data-autofocus onChange={(event) => { setRole(event.currentTarget.value); setOwnerSemanticId(""); setResult(null); }} options={roleOptions} />
          <SelectField id="asset-owner" label="Owner" value={ownerSemanticId} disabled={readOnly || !role || owners.length === 0} onChange={(event) => { setOwnerSemanticId(event.currentTarget.value); setResult(null); }} options={ownerOptions} />
          <TextField id="asset-variant" label="Variant · optional" value={variant} disabled={readOnly} onInput={(event) => setVariant(event.currentTarget.value)} placeholder="Leave blank for base" hint="Use only for a meaningful alternate of the same asset role." />
        </div>
        {role && owners.length === 0 ? <StateMessage title="No canonical owners for this asset type" tone="unavailable">This controlled asset type has no canonical owners in the deployed Studio snapshot.</StateMessage> : null}
        {role && selectedOwner ? <div class="studio-assets-identity-confirmation"><div><span>Will register as</span><strong>{selectedOwner.displayName} · {identityUiRoleLabel(role)}{variant.trim() ? ` · ${variant.trim()}` : " · base"}</strong></div><code>{assetSemanticId}</code></div> : null}
      </section>
      <section class="studio-assets-create-section studio-assets-create-section--source">
        <header class="studio-assets-create-section__heading"><span class="studio-assets-create-section__step">02</span><div><strong>Select source/master</strong><small>The trusted Studio backend uploads this file into the connected Google Drive.</small></div></header>
        {picker}
      </section>
      <footer class="studio-assets-create-footer"><div><span>Registration</span><strong>{canSubmit ? "Ready to add asset" : "Complete identity and source"}</strong></div><Button variant="primary" pending={pending} disabled={readOnly || !canSubmit} onClick={() => void submit()}>Add Asset</Button></footer>
      {result?.kind === "error" ? <StateMessage title="Upload failed" tone="error">{result.message}</StateMessage> : null}
    </div>
  ) : (
    <>
      {!compact ? <div class="studio-assets-operation__heading"><div><span>Source/master</span><h4>Upload replacement</h4></div><small>{readOnly ? "Read-only" : "Editor operation"}</small></div> : null}
      {!compact ? <p>A replacement creates a new WORKING retained version. It does not approve, freeze, publish, or mark the asset runtime-ready.</p> : null}
      {picker}
      <div class="studio-assets-identity-confirmation studio-assets-identity-confirmation--locked"><div><span>Replacing source for</span><strong>{selectedOwner?.displayName ?? selected!.ownerDisplayName} · {identityUiRoleLabel(role)}{variant.trim() ? ` · ${variant.trim()}` : " · base"}</strong></div><code>{assetSemanticId}</code></div>
      <div class="studio-assets-operation__actions"><Button variant="primary" pending={pending} disabled={readOnly || !canSubmit} onClick={() => void submit()}>Upload new version</Button></div>
      {result ? <StateMessage title={result.kind === "success" ? "Upload complete" : "Upload failed"} tone={result.kind === "error" ? "error" : "neutral"}>{result.message}</StateMessage> : null}
    </>
  );

  return compact ? <div class="studio-assets-create-form">{content}</div> : <Surface kind="inset"><div class="studio-assets-operation">{content}</div></Surface>;
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
    } catch (error) { setMessage(error instanceof Error ? error.message : "Version selection failed."); }
    finally { setPendingVersion(null); }
  }

  async function access(versionId: string, disposition: "preview" | "download") {
    try {
      const blob = await fetchAssetSourceBlob(auth, versionId, disposition);
      const url = URL.createObjectURL(blob);
      if (disposition === "preview") window.open(url, "_blank", "noopener,noreferrer");
      else { const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${asset.semanticId}-source`; anchor.click(); }
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Source access failed."); }
  }

  return (
    <div class="studio-assets-detail-list">
      {asset.versionRecords.map((version) => {
        const checksum = version.source.checksum ? `${version.source.checksum.algorithm}:${version.source.checksum.value}` : "Checksum unavailable";
        return <DetailRow key={version.versionId} title={`v${version.versionNumber}${version.current ? " · current" : ""}`} description={`${version.lifecycle} · ${version.source.mediaType ?? "Media type unavailable"}`} meta={`${version.source.providerKind ?? "Provider unavailable"} · ${version.createdAt ?? "Timestamp unavailable"} · ${checksum}`} trailing={<><Button variant="quiet" onClick={() => void access(version.versionId, "preview")}>Preview</Button><Button variant="quiet" onClick={() => void access(version.versionId, "download")}>Download</Button>{!version.current ? <Button variant="secondary" pending={pendingVersion === version.versionId} disabled={readOnly || pendingVersion !== null} onClick={() => void choose(version.versionId)}>Make current</Button> : null}</>} />;
      })}
      {message ? <StateMessage title="Version operation">{message}</StateMessage> : null}
    </div>
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
    setPending(true); setMessage(null);
    try {
      await setAssetRelation(auth, { sourceAssetId: asset.semanticId, relationType: type.trim(), targetAssetId: target, active });
      setMessage(active ? "Asset relation registered." : "Asset relation removed.");
      await onCompleted();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Asset relation operation failed."); }
    finally { setPending(false); }
  }

  return (
    <div class="studio-assets-operation">
      {targets.length > 0 ? <div class="studio-assets-form-grid">
        <TextField id="asset-relation-type" label="Relation type" value={relationType} disabled={readOnly} onInput={(event) => setRelationType(event.currentTarget.value)} />
        <SelectField id="asset-relation-target" label="Target semantic asset" value={targetAssetId} disabled={readOnly} onChange={(event) => setTargetAssetId(event.currentTarget.value)} options={targets.map((target) => ({ value: target.semanticId, label: `${target.ownerDisplayName} · ${identityUiRoleLabel(target.role)}` }))} />
        <Button variant="secondary" pending={pending} disabled={readOnly || !targetAssetId} onClick={() => void set(true)}>Add relation</Button>
      </div> : <StateMessage title="No relation targets yet">Register another semantic asset before adding asset-to-asset relations.</StateMessage>}
      {asset.relations?.map((relation) => <DetailRow key={`${relation.type}:${relation.targetSemanticId}`} title={relation.targetLabel ?? relation.targetSemanticId} description={relation.type} meta={relation.targetSemanticId} trailing={<Button variant="quiet" disabled={readOnly || pending} onClick={() => void set(false, relation.targetSemanticId, relation.type)}>Remove</Button>} />)}
      {message ? <StateMessage title="Relation operation">{message}</StateMessage> : null}
    </div>
  );
}

function TrustedAssetPreview({ asset, auth }: { asset: ProductionAsset; auth: StoredStudioAuthSession }) {
  const version = asset.currentVersion;
  const versionId = version?.versionId ?? null;
  const imagePreview = Boolean(version?.operations?.includes("preview") && version?.mediaType?.startsWith("image/"));
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    let active = true; let objectUrl: string | null = null;
    setPreviewUrl(null); setPreviewState(imagePreview && versionId ? "loading" : "idle");
    if (!imagePreview || !versionId) return () => undefined;
    void fetchAssetSourceBlob(auth, versionId, "preview").then((blob) => { if (!active) return; objectUrl = URL.createObjectURL(blob); setPreviewUrl(objectUrl); setPreviewState("idle"); }).catch(() => { if (active) setPreviewState("error"); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [auth.accessToken, asset.semanticId, imagePreview, versionId]);

  return <MediaPreview src={previewUrl} alt={`${asset.ownerDisplayName} ${identityUiRoleLabel(asset.role)} source preview`} title={previewState === "loading" ? "Loading source preview…" : asset.ownerDisplayName} description={previewState === "error" ? "The trusted preview could not be rendered inline." : imagePreview ? "Source/master preview from the trusted provider boundary." : "This source type does not expose an inline image preview."} testId="asset-live-preview" />;
}

function RuntimeSummary({ asset }: { asset: ProductionAsset }) {
  if (asset.runtimeDerivatives.length === 0) return <StateMessage title={asset.derivativeRequired ? "Runtime derivative required" : "No runtime derivative"} tone={asset.derivativeRequired ? "unavailable" : "neutral"}>Runtime derivative evidence remains separate from source/master approval and lifecycle.</StateMessage>;
  return <div class="studio-assets-detail-list">{asset.runtimeDerivatives.map((item) => <DetailRow key={item.semanticId} title={item.semanticId} description={`${item.outputFormat} · ${item.mediaType}`} meta={item.runtimePath ?? "Runtime path unavailable"} trailing={<StatusTag>{item.technicalState}</StatusTag>} />)}</div>;
}

function RelationsSummary({ asset }: { asset: ProductionAsset }) {
  if ((asset.relations ?? []).length === 0) return <StateMessage title="No registered asset relations">No semantic relations are registered.</StateMessage>;
  return <div class="studio-assets-detail-list">{asset.relations?.map((relation) => <DetailRow key={`${relation.type}:${relation.targetSemanticId}`} title={relation.targetLabel ?? relation.targetSemanticId} description={relation.type} meta={relation.targetSemanticId} />)}</div>;
}

function ValidationSummary({ asset }: { asset: ProductionAsset }) {
  if (asset.issues.length === 0 && asset.validations.length === 0) return <StateMessage title="No registered asset issues">No validation/source issues are registered.</StateMessage>;
  return <div class="studio-assets-detail-list">{asset.validations.map((validation, index) => <DetailRow key={`${validation.dimension}:${index}`} title={validation.dimension} meta={validation.checkedAt ?? "Check time unavailable"} trailing={<StatusTag tone={validation.blocking ? "error" : "success"}>{validation.outcome}</StatusTag>} />)}{asset.issues.map((issue, index) => <DetailRow key={`${issue.code ?? "issue"}:${index}`} title={issue.code ?? "Asset issue"} description={issue.message} trailing={<StatusTag tone={issue.severity.toLocaleLowerCase().includes("error") || issue.severity.toLocaleLowerCase().includes("block") ? "error" : "warning"}>{issue.severity}</StatusTag>} />)}</div>;
}

function SelectedAssetWorkspace({ asset, allAssets, auth, response, readOnly, onCompleted }: { asset: ProductionAsset; allAssets: readonly ProductionAsset[]; auth: StoredStudioAuthSession; response: StudioReadModelsResponse; readOnly: boolean; onCompleted: () => Promise<void> }) {
  const [detail, setDetail] = useState<AssetDetailTab>("versions");
  const [replacing, setReplacing] = useState(false);
  const [relating, setRelating] = useState(false);
  const [sourceMessage, setSourceMessage] = useState<string | null>(null);
  const version = asset.currentVersion;
  const currentVersionId = version?.versionId ?? null;
  const tabsId = `asset-details-${asset.semanticId.replace(/[^a-z0-9]+/gi, "-")}`;

  async function sourceAccess(disposition: "preview" | "download") {
    if (!currentVersionId) return;
    setSourceMessage(null);
    try {
      const blob = await fetchAssetSourceBlob(auth, currentVersionId, disposition);
      const url = URL.createObjectURL(blob);
      if (disposition === "preview") window.open(url, "_blank", "noopener,noreferrer");
      else { const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${asset.semanticId}-source`; anchor.click(); }
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (error) { setSourceMessage(error instanceof Error ? error.message : "Source access failed."); }
  }

  return (
    <DetailPanel label={`Selected asset ${asset.semanticId}`} eyebrow={`${identityUiRoleLabel(asset.role)}${asset.variant ? ` · ${asset.variant}` : ""}`} title={asset.ownerDisplayName} semanticId={asset.semanticId} status={<StatusGroup label="Asset status"><StatusTag>{asset.lifecycle ?? "Lifecycle unavailable"}</StatusTag><StatusTag tone={readinessTone(asset.readiness)}>{asset.readiness}</StatusTag></StatusGroup>}>
      <PreviewSummaryLayout
        preview={<TrustedAssetPreview key={`preview:${asset.semanticId}:${currentVersionId ?? "none"}`} asset={asset} auth={auth} />}
        summary={<><div class="studio-assets-summary-title"><span>Current source/master</span><strong>{versionLabel(asset)}</strong></div><KeyValueList label="Current source facts"><KeyValue label="Source">{version?.sourceAvailable ? "Available" : "Unavailable"}</KeyValue><KeyValue label="Media">{version?.mediaType ?? "Not registered"}</KeyValue><KeyValue label="Dimensions">{version?.dimensions ? `${version.dimensions.width} × ${version.dimensions.height}` : "Not registered"}</KeyValue><KeyValue label="Size">{formatBytes(version?.byteSize ?? null)}</KeyValue><KeyValue label="Versions">{asset.versionRecords.length}</KeyValue><KeyValue label="Runtime">{asset.runtimeDerivatives.length}</KeyValue></KeyValueList><div class="studio-assets-summary-actions">{version?.operations?.includes("preview") ? <Button variant="secondary" onClick={() => void sourceAccess("preview")}>Open preview</Button> : null}{version?.operations?.includes("download") ? <Button variant="quiet" onClick={() => void sourceAccess("download")}>Download source</Button> : null}{!readOnly ? <Button variant="primary" onClick={() => setReplacing(true)}>Replace source</Button> : null}</div>{sourceMessage ? <StateMessage title="Source access">{sourceMessage}</StateMessage> : null}</>}
      />
      <section class="studio-assets-details">
        <Tabs id={tabsId} label="Selected asset details" tabs={detailTabs.map((tab) => ({ id: tab.id, label: `${tab.label} · ${tab.id === "versions" ? asset.versionRecords.length : tab.id === "runtime" ? asset.runtimeDerivatives.length : tab.id === "relations" ? asset.relations?.length ?? 0 : asset.issues.length}` }))} selectedId={detail} onSelect={(id) => setDetail(id as AssetDetailTab)} />
        <div class="studio-assets-details__body">
          <TabPanel tabsId={tabsId} tabId="versions" selected={detail === "versions"}><VersionOperations asset={asset} auth={auth} readOnly={readOnly} onCompleted={onCompleted} /></TabPanel>
          <TabPanel tabsId={tabsId} tabId="runtime" selected={detail === "runtime"}><RuntimeSummary asset={asset} /></TabPanel>
          <TabPanel tabsId={tabsId} tabId="relations" selected={detail === "relations"}><RelationsSummary asset={asset} /></TabPanel>
          <TabPanel tabsId={tabsId} tabId="validation" selected={detail === "validation"}><ValidationSummary asset={asset} /></TabPanel>
        </div>
        {!readOnly ? <div class="studio-assets-details__actions"><Button variant="quiet" onClick={() => setRelating(true)}>Manage relations</Button></div> : null}
      </section>
      {replacing ? <Dialog id="replace-asset-source-dialog" open onOpenChange={setReplacing} title="Replace source/master" description="Upload a new retained WORKING version for this semantic asset. Lifecycle approval and runtime readiness do not change."><p class="studio-assets-dialog-note">The existing source/master version remains retained in history.</p><SourceMutationForm key={`replace:${asset.semanticId}`} selected={asset} response={response} auth={auth} readOnly={readOnly} compact onCompleted={async () => { await onCompleted(); setReplacing(false); }} /></Dialog> : null}
      {relating ? <Dialog id="asset-relations-dialog" open onOpenChange={setRelating} title="Manage asset relations" description="Register or remove semantic asset-to-asset relations. Provider folders and filenames are not relation authority."><RelationOperations key={`relations:${asset.semanticId}`} asset={asset} allAssets={allAssets} auth={auth} readOnly={readOnly} onCompleted={onCompleted} /></Dialog> : null}
    </DetailPanel>
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
      if (query && ![asset.semanticId, asset.ownerDisplayName, asset.role, identityUiRoleLabel(asset.role), asset.variant ?? ""].some((value) => value.toLocaleLowerCase().includes(query))) return false;
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

  function clearFilters() { setText(""); setOwner("all"); setRole("all"); setVariant("all"); setLifecycle("all"); setReadiness("all"); setSource("all"); }

  const browser = (
    <CollectionPanel title="Asset library" count={`${filtered.length} / ${allAssets.length}`} actions={hasActiveFilters ? <Button variant="quiet" onClick={clearFilters}>Clear</Button> : undefined}>
      <div class="studio-assets-browser-controls">
        <FilterBar label="Asset browser filters" expanded={filtersOpen} primary={<><TextField id="assets-search" label="Search assets" type="search" value={text} onInput={(event) => setText(event.currentTarget.value)} placeholder="Owner, type, variant or semantic ID" /><SelectField id="assets-role-filter" label="Asset type" value={role} onChange={(event) => setRole(event.currentTarget.value)} options={[{ value: "all", label: "All asset types" }, ...roles.map((value) => ({ value, label: identityUiRoleLabel(value) }))]} /><SelectField id="assets-owner-filter" label="Owner" value={owner} onChange={(event) => setOwner(event.currentTarget.value)} options={[{ value: "all", label: "All owners" }, ...owners.map((value) => ({ value, label: ownerLabels.get(value) ?? value }))]} /></>} actions={<><Button variant="quiet" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>{filtersOpen ? "Hide filters" : "More filters"}</Button><span>{hasActiveFilters ? "Filters active" : "Showing all assets"}</span></>} secondary={<><SelectField id="assets-variant-filter" label="Variant" value={variant} onChange={(event) => setVariant(event.currentTarget.value)} options={[{ value: "all", label: "All variants" }, ...variants.map((value) => ({ value, label: value }))]} /><SelectField id="assets-lifecycle-filter" label="Lifecycle" value={lifecycle} onChange={(event) => setLifecycle(event.currentTarget.value)} options={[{ value: "all", label: "All lifecycle states" }, ...lifecycleOptions.map((value) => ({ value, label: value }))]} /><SelectField id="assets-readiness-filter" label="Readiness" value={readiness} onChange={(event) => setReadiness(event.currentTarget.value)} options={[{ value: "all", label: "All readiness" }, { value: "ready", label: "Ready" }, { value: "warning", label: "Warning" }, { value: "blocked", label: "Blocked" }, { value: "unknown", label: "Unknown" }]} /><SelectField id="assets-source-filter" label="Source/master" value={source} onChange={(event) => setSource(event.currentTarget.value)} options={[{ value: "all", label: "All source states" }, { value: "available", label: "Source available" }, { value: "missing", label: "Source missing" }]} /></>} />
      </div>
      {filtered.length === 0 ? <div class="studio-assets-browser-empty"><strong>No matching assets</strong><span>Adjust the browser filters or return to the full library.</span><Button variant="secondary" onClick={clearFilters}>Clear filters</Button></div> : <div class="studio-assets-selector-rail"><SelectableCollection label="Semantic assets">{filtered.map((asset) => <SelectableRow key={asset.semanticId} selected={selected?.semanticId === asset.semanticId} onSelect={() => setSelectedId(asset.semanticId)} label={`${asset.ownerDisplayName}, ${identityUiRoleLabel(asset.role)}, ${versionLabel(asset)}`}><MediaCollectionItem marker={mediaMarker(asset)} title={asset.ownerDisplayName} subtitle={`${identityUiRoleLabel(asset.role)}${asset.variant ? ` · ${asset.variant}` : ""}`} trailing={versionLabel(asset)} meta={<><StatusTag>{asset.lifecycle ?? "Lifecycle unavailable"}</StatusTag><StatusTag tone={readinessTone(asset.readiness)}>{asset.readiness}</StatusTag>{!asset.currentVersion?.sourceAvailable ? <StatusTag tone="warning">Source missing</StatusTag> : null}</>} /></SelectableRow>)}</SelectableCollection></div>}
    </CollectionPanel>
  );

  return (
    <CollectionTemplate className="studio-assets-workspace" header={<TemplateFixtureHeading title="Assets" description="Source/master asset library with retained versions, runtime evidence, relations and validation." />} toolbar={<TemplateToolbar><span>{allAssets.length} semantic asset{allAssets.length === 1 ? "" : "s"}</span><GoogleDriveConnection auth={auth} canManage={canManageDrive} />{!readOnly ? <Button variant="primary" onClick={() => setCreating(true)}>+ Add Asset</Button> : <span>Viewer · read-only</span>}</TemplateToolbar>}>
      {allAssets.length === 0 ? <StateMessage title="No assets yet" action={!readOnly ? <Button variant="primary" onClick={() => setCreating(true)}>Add first asset</Button> : undefined}>Upload the first source/master when you are ready.</StateMessage> : <MasterDetailLayout master={browser} masterLabel="Asset browser" detail={selected ? <SelectedAssetWorkspace key={selected.semanticId} asset={selected} allAssets={allAssets} auth={auth} response={response} readOnly={readOnly} onCompleted={onRefresh} /> : <StateMessage title="No asset selected">Clear or adjust the browser filters to inspect an asset.</StateMessage>} detailLabel="Selected asset details" />}
      {creating ? <Dialog id="add-asset-dialog" open onOpenChange={setCreating} title="Add Asset" description="Define the controlled asset identity, then attach its source/master. Studio derives the semantic ID and trusted Google Drive destination."><SourceMutationForm selected={null} response={response} auth={auth} readOnly={readOnly} compact onCompleted={async () => { await onRefresh(); setCreating(false); }} /></Dialog> : null}
      {readOnly ? <StateMessage title="Read-only Assets workspace" tone="unavailable">Your Studio role can inspect semantic assets, retained versions, validation and runtime evidence but cannot register, replace, restore or relate sources.</StateMessage> : null}
    </CollectionTemplate>
  );
}
