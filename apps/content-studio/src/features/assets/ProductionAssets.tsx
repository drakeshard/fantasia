import { useEffect, useMemo, useState } from "preact/hooks";
import type { StudioReadModelsResponse } from "../../dashboard-model";
import type { StoredStudioAuthSession } from "../../studio-session";
import { AssetBoard } from "../../ui/asset-board";
import {
  Button,
  Dialog,
  SelectField,
  StateMessage,
  Surface,
  TextField,
} from "../../ui/primitives";
import {
  AssetBoardTemplate,
  CollectionTemplate,
  TemplateFixtureHeading,
  TemplateToolbar,
} from "../../ui/workspace";
import {
  beginGoogleDriveConnection,
  fetchAssetSourceBlob,
  getGoogleDriveConnectionStatus,
  selectAssetVersion,
  setAssetRelation,
  uploadDriveAssetSource,
  type GoogleDriveConnectionStatus,
} from "./api";
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

const commonAssetTypes = [
  "portrait",
  "battle-sprite",
  "concept-art",
  "equipment-design",
  "map",
  "ui",
  "audio",
] as const;

function unique(values: readonly (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function semanticAssetId(ownerSemanticId: string, role: string, variant: string): string {
  const segments = ["asset", ownerSemanticId, role, variant || "base"]
    .map((segment) =>
      segment
        .trim()
        .toLocaleLowerCase()
        .replace(/[^a-z0-9.-]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean);
  return segments.join(".");
}

function GoogleDriveConnection({
  auth,
  canManage,
}: {
  auth: StoredStudioAuthSession;
  canManage: boolean;
}) {
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
        if (active)
          setMessage(error instanceof Error ? error.message : "Google Drive status is unavailable.");
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
    <Surface kind="inset" className="studio-assets-drive-status">
      <div class="studio-assets-operation__heading">
        <div>
          <span>Source/master</span>
          <h4>
            {status?.connected
              ? `Google Drive · Connected as ${status.accountEmail ?? "connected account"}`
              : "Google Drive · Not connected"}
          </h4>
        </div>
        {canManage ? (
          <Button variant="secondary" pending={pending} onClick={() => void connect()}>
            {status?.connected ? "Reconnect" : "Connect Google Drive"}
          </Button>
        ) : null}
      </div>
      {message ? <StateMessage title="Google Drive">{message}</StateMessage> : null}
    </Surface>
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
  const owners = assetOwnerOptions(response);
  const [ownerSemanticId, setOwnerSemanticId] = useState(
    selected?.ownerSemanticId ?? owners[0]?.semanticId ?? "",
  );
  const [role, setRole] = useState(selected?.role ?? "portrait");
  const [variant, setVariant] = useState(selected?.variant ?? "base");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ kind: "success" | "error"; message: string } | null>(
    null,
  );
  const identityLocked = selected !== null;
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
      if (selected) {
        setResult({
          kind: "success",
          message: "A new retained source/master version was created and made current.",
        });
      }
    } catch (error) {
      setResult({
        kind: "error",
        message: error instanceof Error ? error.message : "Asset upload failed.",
      });
    } finally {
      setPending(false);
    }
  }

  const content = (
    <>
      {!compact ? (
        <div class="studio-assets-operation__heading">
          <div>
            <span>Source/master</span>
            <h4>Upload replacement</h4>
          </div>
          <small>{readOnly ? "Read-only" : "Editor operation"}</small>
        </div>
      ) : null}
      {!compact ? (
        <p>
          A replacement creates a new WORKING retained version. It does not approve, freeze, publish,
          or mark the asset runtime-ready.
        </p>
      ) : null}
      <label class="ui-field" for="asset-source-file">
        <span class="ui-field__label">Upload file</span>
        <input
          id="asset-source-file"
          class="ui-control studio-assets-file-input"
          type="file"
          disabled={readOnly}
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
        />
      </label>
      {owners.length === 0 ? (
        <StateMessage title="No canonical owners available" tone="unavailable">
          Asset registration requires an owner produced by a supported canonical Git adapter.
        </StateMessage>
      ) : (
        <div class="studio-assets-form-grid">
          <SelectField
            id="asset-owner"
            label="Owner"
            value={ownerSemanticId}
            disabled={readOnly || identityLocked}
            onChange={(event) => setOwnerSemanticId(event.currentTarget.value)}
            options={owners.map((owner) => ({
              value: owner.semanticId,
              label: `${owner.displayName} · ${owner.entityType}`,
            }))}
          />
          <SelectField
            id="asset-role"
            label="Asset type"
            value={role}
            disabled={readOnly || identityLocked}
            onChange={(event) => setRole(event.currentTarget.value)}
            options={unique([selected?.role ?? null, ...commonAssetTypes]).map((value) => ({
              value,
              label: value,
            }))}
          />
          <TextField
            id="asset-variant"
            label="Variant · optional"
            value={variant}
            disabled={readOnly || identityLocked}
            onInput={(event) => setVariant(event.currentTarget.value)}
            placeholder="base"
          />
        </div>
      )}
      <div class="studio-assets-operation__actions">
        <Button
          variant="primary"
          pending={pending}
          disabled={readOnly || !canSubmit}
          onClick={() => void submit()}
        >
          {selected ? "Upload new version" : "Add Asset"}
        </Button>
      </div>
      {result ? (
        <StateMessage
          title={result.kind === "success" ? "Upload complete" : "Upload failed"}
          tone={result.kind === "error" ? "error" : "neutral"}
        >
          {result.message}
        </StateMessage>
      ) : null}
    </>
  );

  return compact ? (
    <div class="studio-assets-create-form">{content}</div>
  ) : (
    <Surface kind="inset" className="studio-assets-operation">
      {content}
    </Surface>
  );
}

function VersionOperations({
  asset,
  auth,
  readOnly,
  onCompleted,
}: {
  asset: ProductionAsset;
  auth: StoredStudioAuthSession;
  readOnly: boolean;
  onCompleted: () => Promise<void>;
}) {
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
      if (disposition === "preview") {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
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
    <Surface kind="inset" className="studio-assets-operation">
      <div class="studio-assets-operation__heading">
        <div>
          <span>Retained versions</span>
          <h4>Source access & current selection</h4>
        </div>
      </div>
      <div class="studio-assets-version-actions">
        {asset.versionRecords.map((version) => (
          <div class="studio-assets-version-action" key={version.versionId}>
            <div>
              <strong>
                v{version.versionNumber}
                {version.current ? " · current" : ""}
              </strong>
              <small>{version.lifecycle}</small>
            </div>
            <div>
              <Button variant="quiet" onClick={() => void access(version.versionId, "preview")}>
                Preview
              </Button>
              <Button variant="quiet" onClick={() => void access(version.versionId, "download")}>
                Download
              </Button>
              {!version.current ? (
                <Button
                  variant="secondary"
                  pending={pendingVersion === version.versionId}
                  disabled={readOnly || pendingVersion !== null}
                  onClick={() => void choose(version.versionId)}
                >
                  Make current
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {message ? <StateMessage title="Version operation">{message}</StateMessage> : null}
    </Surface>
  );
}

function RelationOperations({
  asset,
  allAssets,
  auth,
  readOnly,
  onCompleted,
}: {
  asset: ProductionAsset;
  allAssets: readonly ProductionAsset[];
  auth: StoredStudioAuthSession;
  readOnly: boolean;
  onCompleted: () => Promise<void>;
}) {
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
      await setAssetRelation(auth, {
        sourceAssetId: asset.semanticId,
        relationType: type.trim(),
        targetAssetId: target,
        active,
      });
      setMessage(active ? "Asset relation registered." : "Asset relation removed.");
      await onCompleted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Asset relation operation failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Surface kind="inset" className="studio-assets-operation">
      <div class="studio-assets-operation__heading">
        <div>
          <span>Semantic relations</span>
          <h4>Asset-to-asset relations</h4>
        </div>
      </div>
      {targets.length > 0 ? (
        <div class="studio-assets-form-grid">
          <TextField
            id="asset-relation-type"
            label="Relation type"
            value={relationType}
            disabled={readOnly}
            onInput={(event) => setRelationType(event.currentTarget.value)}
          />
          <SelectField
            id="asset-relation-target"
            label="Target semantic asset"
            value={targetAssetId}
            disabled={readOnly}
            onChange={(event) => setTargetAssetId(event.currentTarget.value)}
            options={targets.map((target) => ({
              value: target.semanticId,
              label: target.semanticId,
            }))}
          />
          <Button
            variant="secondary"
            pending={pending}
            disabled={readOnly || !targetAssetId}
            onClick={() => void set(true)}
          >
            Add relation
          </Button>
        </div>
      ) : (
        <StateMessage title="No relation targets yet">
          Register another semantic asset before adding asset-to-asset relations.
        </StateMessage>
      )}
      {asset.relations?.map((relation) => (
        <div
          class="studio-assets-relation-action"
          key={`${relation.type}:${relation.targetSemanticId}`}
        >
          <code>
            {relation.type} → {relation.targetSemanticId}
          </code>
          <Button
            variant="quiet"
            disabled={readOnly || pending}
            onClick={() => void set(false, relation.targetSemanticId, relation.type)}
          >
            Remove
          </Button>
        </div>
      ))}
      {message ? <StateMessage title="Relation operation">{message}</StateMessage> : null}
    </Surface>
  );
}

export function ProductionAssets({
  response,
  auth,
  readOnly,
  canManageDrive,
  semanticId,
  onRefresh,
}: {
  response: StudioReadModelsResponse;
  auth: StoredStudioAuthSession;
  readOnly: boolean;
  canManageDrive: boolean;
  semanticId: string | null;
  onRefresh: () => Promise<void>;
}) {
  const allAssets = productionAssets(response);
  const [text, setText] = useState(semanticId ?? "");
  const [owner, setOwner] = useState("all");
  const [role, setRole] = useState("all");
  const [variant, setVariant] = useState("all");
  const [lifecycle, setLifecycle] = useState("all");
  const [readiness, setReadiness] = useState("all");
  const [source, setSource] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(semanticId);
  const [creating, setCreating] = useState(false);

  const owners = unique(allAssets.map((asset) => asset.ownerSemanticId));
  const roles = unique(allAssets.map((asset) => asset.role));
  const variants = unique(allAssets.map((asset) => asset.variant));

  const filtered = useMemo(() => {
    const query = text.trim().toLocaleLowerCase();
    return allAssets.filter((asset) => {
      if (
        query &&
        !asset.semanticId.toLocaleLowerCase().includes(query) &&
        !asset.ownerDisplayName.toLocaleLowerCase().includes(query) &&
        !asset.role.toLocaleLowerCase().includes(query)
      )
        return false;
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

  const selected = allAssets.find((asset) => asset.semanticId === selectedId) ?? filtered[0] ?? null;
  const selectionKey = selected?.semanticId ?? "no-selection";

  return (
    <CollectionTemplate
      className="studio-assets-workspace"
      header={
        <TemplateFixtureHeading
          title="Assets"
          description="Source/master assets, retained versions, relations and runtime evidence."
        />
      }
      toolbar={
        <TemplateToolbar>
          <span>
            {allAssets.length} semantic asset{allAssets.length === 1 ? "" : "s"}
          </span>
          {!readOnly ? (
            <Button variant="primary" onClick={() => setCreating(true)}>
              + Add Asset
            </Button>
          ) : null}
          <span>{readOnly ? "Viewer · read-only" : "Trusted source operations enabled"}</span>
        </TemplateToolbar>
      }
      filterSlot={
        allAssets.length > 0 ? (
          <>
            <TextField
              id="assets-search"
              label="Search assets"
              type="search"
              value={text}
              onInput={(event) => setText(event.currentTarget.value)}
              placeholder="Semantic ID, owner, role"
            />
            <SelectField
              id="assets-owner-filter"
              label="Owner"
              value={owner}
              onChange={(event) => setOwner(event.currentTarget.value)}
              options={[
                { value: "all", label: "All owners" },
                ...owners.map((value) => ({ value, label: value })),
              ]}
            />
            <SelectField
              id="assets-role-filter"
              label="Role"
              value={role}
              onChange={(event) => setRole(event.currentTarget.value)}
              options={[
                { value: "all", label: "All roles" },
                ...roles.map((value) => ({ value, label: value })),
              ]}
            />
            <SelectField
              id="assets-variant-filter"
              label="Variant"
              value={variant}
              onChange={(event) => setVariant(event.currentTarget.value)}
              options={[
                { value: "all", label: "All variants" },
                ...variants.map((value) => ({ value, label: value })),
              ]}
            />
            <SelectField
              id="assets-lifecycle-filter"
              label="Lifecycle"
              value={lifecycle}
              onChange={(event) => setLifecycle(event.currentTarget.value)}
              options={[
                { value: "all", label: "All lifecycle states" },
                ...lifecycleOptions.map((value) => ({ value, label: value })),
              ]}
            />
            <SelectField
              id="assets-readiness-filter"
              label="Readiness"
              value={readiness}
              onChange={(event) => setReadiness(event.currentTarget.value)}
              options={[
                { value: "all", label: "All readiness" },
                { value: "ready", label: "Ready" },
                { value: "warning", label: "Warning" },
                { value: "blocked", label: "Blocked" },
                { value: "unknown", label: "Unknown" },
              ]}
            />
            <SelectField
              id="assets-source-filter"
              label="Source/master"
              value={source}
              onChange={(event) => setSource(event.currentTarget.value)}
              options={[
                { value: "all", label: "All source states" },
                { value: "available", label: "Source available" },
                { value: "missing", label: "Source missing" },
              ]}
            />
          </>
        ) : null
      }
    >
      <GoogleDriveConnection auth={auth} canManage={canManageDrive} />

      {allAssets.length === 0 ? (
        <StateMessage
          title="No assets yet"
          action={
            !readOnly ? (
              <Button variant="primary" onClick={() => setCreating(true)}>
                Add first asset
              </Button>
            ) : undefined
          }
        >
          Upload the first source/master when you are ready.
        </StateMessage>
      ) : filtered.length === 0 ? (
        <StateMessage title="No assets match these filters">
          Clear or adjust the collection filters. Registry data was not changed.
        </StateMessage>
      ) : (
        <div class="studio-assets-selector" aria-label="Filtered semantic assets">
          {filtered.map((asset) => (
            <Button
              key={asset.semanticId}
              variant={selected?.semanticId === asset.semanticId ? "secondary" : "quiet"}
              aria-pressed={selected?.semanticId === asset.semanticId}
              onClick={() => setSelectedId(asset.semanticId)}
            >
              {asset.role} · {asset.ownerDisplayName}
            </Button>
          ))}
        </div>
      )}

      {selected ? (
        <AssetBoardTemplate
          header={
            <TemplateFixtureHeading
              title={`${selected.role}${selected.variant ? ` · ${selected.variant}` : ""}`}
              description={`${selected.ownerDisplayName} · ${selected.semanticId}`}
            />
          }
        >
          <AssetBoard assets={[selected]} readOnly={readOnly} />
        </AssetBoardTemplate>
      ) : null}

      {selected ? (
        <div class="studio-assets-operations-grid">
          <SourceMutationForm
            key={`source:${selectionKey}`}
            selected={selected}
            response={response}
            auth={auth}
            readOnly={readOnly}
            onCompleted={onRefresh}
          />
          <VersionOperations
            key={`versions:${selectionKey}`}
            asset={selected}
            auth={auth}
            readOnly={readOnly}
            onCompleted={onRefresh}
          />
          <RelationOperations
            key={`relations:${selectionKey}`}
            asset={selected}
            allAssets={allAssets}
            auth={auth}
            readOnly={readOnly}
            onCompleted={onRefresh}
          />
        </div>
      ) : null}

      {creating ? (
        <Dialog
          id="add-asset-dialog"
          open
          onOpenChange={setCreating}
          title="Add Asset"
          description="Upload a source/master, choose its owner and type, then add it. Studio handles the semantic identity and Google Drive location."
        >
          <SourceMutationForm
            selected={null}
            response={response}
            auth={auth}
            readOnly={readOnly}
            compact
            onCompleted={async () => {
              await onRefresh();
              setCreating(false);
            }}
          />
        </Dialog>
      ) : null}

      {readOnly ? (
        <StateMessage title="Read-only Assets workspace" tone="unavailable">
          Your Studio role can inspect semantic assets, retained versions, validation and runtime
          evidence but cannot register, replace, restore or relate sources.
        </StateMessage>
      ) : null}
    </CollectionTemplate>
  );
}
