import { useMemo, useState } from "preact/hooks";
import type { StudioReadModelsResponse } from "../../dashboard-model";
import type { StoredStudioAuthSession } from "../../studio-session";
import { AssetBoard } from "../../ui/asset-board";
import {
  Button,
  Checkbox,
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
  fetchAssetSourceBlob,
  registerDriveAssetSource,
  selectAssetVersion,
  setAssetRelation,
  uploadDriveAssetSource,
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

function unique(values: readonly (string | null)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort();
}

function SourceMutationPanel({
  selected,
  response,
  auth,
  readOnly,
  onCompleted,
}: {
  selected: ProductionAsset | null;
  response: StudioReadModelsResponse;
  auth: StoredStudioAuthSession;
  readOnly: boolean;
  onCompleted: () => Promise<void>;
}) {
  const owners = assetOwnerOptions(response);
  const [ownerSemanticId, setOwnerSemanticId] = useState(selected?.ownerSemanticId ?? owners[0]?.semanticId ?? "");
  const [assetSemanticId, setAssetSemanticId] = useState(selected?.semanticId ?? "");
  const [role, setRole] = useState(selected?.role ?? "");
  const [variant, setVariant] = useState(selected?.variant ?? "");
  const [derivativeRequired, setDerivativeRequired] = useState(selected?.derivativeRequired ?? false);
  const [driveReference, setDriveReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  const identityLocked = selected !== null;
  const canSubmit = Boolean(ownerSemanticId && assetSemanticId.trim() && role.trim() && (driveReference.trim() || file));

  async function submit() {
    if (readOnly || !canSubmit || pending) return;
    setPending(true);
    setResult(null);
    try {
      const common = {
        ownerSemanticId,
        assetSemanticId: assetSemanticId.trim(),
        role: role.trim(),
        variant: variant.trim() || null,
        derivativeRequired,
      };
      if (file) {
        await uploadDriveAssetSource(auth, { ...common, file });
      } else {
        await registerDriveAssetSource(auth, {
          ...common,
          driveFileReference: driveReference.trim(),
        });
      }
      setResult({
        kind: "success",
        message: selected
          ? "A new retained source/master version was created and made current."
          : "Semantic asset and first source/master version were registered.",
      });
      setDriveReference("");
      setFile(null);
      await onCompleted();
    } catch (error) {
      setResult({
        kind: "error",
        message: error instanceof Error ? error.message : "Asset source operation failed.",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Surface kind="inset" className="studio-assets-operation">
      <div class="studio-assets-operation__heading">
        <div>
          <span>Drive source / master</span>
          <h4>{selected ? "Create replacement version" : "Register semantic asset"}</h4>
        </div>
        <small>{readOnly ? "Read-only" : "Editor operation"}</small>
      </div>
      <p>
        Google Drive remains source/master authority. Uploading or registering source material creates
        a WORKING asset version; it does not grant visual approval, runtime readiness, or publication.
      </p>
      {owners.length === 0 ? (
        <StateMessage title="No canonical owners available" tone="unavailable">
          Asset registration requires an owner produced by a supported canonical Git adapter.
        </StateMessage>
      ) : (
        <div class="studio-assets-form-grid">
          <SelectField
            id="asset-owner"
            label="Owning entity"
            value={ownerSemanticId}
            disabled={readOnly || identityLocked}
            onChange={(event) => setOwnerSemanticId(event.currentTarget.value)}
            options={owners.map((owner) => ({
              value: owner.semanticId,
              label: `${owner.displayName} · ${owner.entityType} · ${owner.semanticId}`,
            }))}
          />
          <TextField
            id="asset-semantic-id"
            label="Semantic asset ID"
            value={assetSemanticId}
            disabled={readOnly || identityLocked}
            onInput={(event) => setAssetSemanticId(event.currentTarget.value)}
            hint="Stable semantic identity; Drive file IDs and filenames are never used as this ID."
          />
          <TextField
            id="asset-role"
            label="Role"
            value={role}
            disabled={readOnly || identityLocked}
            onInput={(event) => setRole(event.currentTarget.value)}
            placeholder="portrait, battle-sprite, equipment-design…"
          />
          <TextField
            id="asset-variant"
            label="Variant"
            value={variant}
            disabled={readOnly || identityLocked}
            onInput={(event) => setVariant(event.currentTarget.value)}
            placeholder="base, expression-happy…"
          />
        </div>
      )}
      <Checkbox
        id="asset-derivative-required"
        label="Runtime derivative required"
        description="This records requirement only; STUDIO12 owns derivative processing."
        checked={derivativeRequired}
        disabled={readOnly || identityLocked}
        onChange={(event) => setDerivativeRequired(event.currentTarget.checked)}
      />
      <div class="studio-assets-source-choice">
        <TextField
          id="asset-drive-reference"
          label="Existing Google Drive file"
          value={driveReference}
          disabled={readOnly || Boolean(file)}
          onInput={(event) => setDriveReference(event.currentTarget.value)}
          placeholder="Drive file URL or file ID"
          hint="The trusted server verifies provider metadata and computes SHA-256 before registry commit."
        />
        <label class="ui-field" for="asset-source-file">
          <span class="ui-field__label">Or upload source/master file</span>
          <input
            id="asset-source-file"
            class="ui-control studio-assets-file-input"
            type="file"
            disabled={readOnly || Boolean(driveReference.trim())}
            onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
          />
          <span class="ui-field__message">
            Upload bytes pass through the trusted Studio boundary into the configured Drive source folder.
          </span>
        </label>
      </div>
      <div class="studio-assets-operation__actions">
        <Button variant="primary" pending={pending} disabled={readOnly || !canSubmit} onClick={() => void submit()}>
          {selected ? "Create new source version" : "Register asset source"}
        </Button>
      </div>
      {result ? (
        <StateMessage title={result.kind === "success" ? "Source operation complete" : "Source operation failed"} tone={result.kind === "error" ? "error" : "neutral"}>
          {result.message}
        </StateMessage>
      ) : null}
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
              <strong>v{version.versionNumber}{version.current ? " · current" : ""}</strong>
              <small>{version.lifecycle}</small>
            </div>
            <div>
              <Button variant="quiet" onClick={() => void access(version.versionId, "preview")}>Preview</Button>
              <Button variant="quiet" onClick={() => void access(version.versionId, "download")}>Download</Button>
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
            options={targets.map((target) => ({ value: target.semanticId, label: target.semanticId }))}
          />
          <Button variant="secondary" pending={pending} disabled={readOnly || !targetAssetId} onClick={() => void set(true)}>
            Add relation
          </Button>
        </div>
      ) : (
        <StateMessage title="No relation targets yet">Register another semantic asset before adding asset-to-asset relations.</StateMessage>
      )}
      {asset.relations?.map((relation) => (
        <div class="studio-assets-relation-action" key={`${relation.type}:${relation.targetSemanticId}`}>
          <code>{relation.type} → {relation.targetSemanticId}</code>
          <Button variant="quiet" disabled={readOnly || pending} onClick={() => void set(false, relation.targetSemanticId, relation.type)}>
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
  semanticId,
  onRefresh,
}: {
  response: StudioReadModelsResponse;
  auth: StoredStudioAuthSession;
  readOnly: boolean;
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
      ) return false;
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

  const selected =
    allAssets.find((asset) => asset.semanticId === selectedId) ??
    filtered[0] ??
    null;

  return (
    <CollectionTemplate
      className="studio-assets-workspace"
      header={
        <TemplateFixtureHeading
          title="Assets"
          description="Drive-authoritative source/master assets, retained registry versions, semantic relations and read-only runtime evidence."
        />
      }
      toolbar={
        <TemplateToolbar>
          <span>{allAssets.length} semantic asset{allAssets.length === 1 ? "" : "s"}</span>
          <span>{readOnly ? "Viewer · read-only" : "Trusted source operations enabled"}</span>
        </TemplateToolbar>
      }
      filterSlot={
        <>
          <TextField id="assets-search" label="Search assets" type="search" value={text} onInput={(event) => setText(event.currentTarget.value)} placeholder="Semantic ID, owner, role" />
          <SelectField id="assets-owner-filter" label="Owner" value={owner} onChange={(event) => setOwner(event.currentTarget.value)} options={[{ value: "all", label: "All owners" }, ...owners.map((value) => ({ value, label: value }))]} />
          <SelectField id="assets-role-filter" label="Role" value={role} onChange={(event) => setRole(event.currentTarget.value)} options={[{ value: "all", label: "All roles" }, ...roles.map((value) => ({ value, label: value }))]} />
          <SelectField id="assets-variant-filter" label="Variant" value={variant} onChange={(event) => setVariant(event.currentTarget.value)} options={[{ value: "all", label: "All variants" }, ...variants.map((value) => ({ value, label: value }))]} />
          <SelectField id="assets-lifecycle-filter" label="Lifecycle" value={lifecycle} onChange={(event) => setLifecycle(event.currentTarget.value)} options={[{ value: "all", label: "All lifecycle states" }, ...lifecycleOptions.map((value) => ({ value, label: value }))]} />
          <SelectField id="assets-readiness-filter" label="Readiness" value={readiness} onChange={(event) => setReadiness(event.currentTarget.value)} options={[{ value: "all", label: "All readiness" }, { value: "ready", label: "Ready" }, { value: "warning", label: "Warning" }, { value: "blocked", label: "Blocked" }, { value: "unknown", label: "Unknown" }]} />
          <SelectField id="assets-source-filter" label="Source/master" value={source} onChange={(event) => setSource(event.currentTarget.value)} options={[{ value: "all", label: "All source states" }, { value: "available", label: "Source available" }, { value: "missing", label: "Source missing" }]} />
        </>
      }
    >
      {allAssets.length === 0 ? (
        <StateMessage title="No semantic assets registered yet">
          The production registry is empty. Register the first Drive source/master below; no fixture assets are shown in production.
        </StateMessage>
      ) : filtered.length === 0 ? (
        <StateMessage title="No assets match these filters">Clear or adjust the collection filters. Registry data was not changed.</StateMessage>
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

      <div class="studio-assets-operations-grid">
        <SourceMutationPanel selected={selected} response={response} auth={auth} readOnly={readOnly} onCompleted={onRefresh} />
        {selected ? <VersionOperations asset={selected} auth={auth} readOnly={readOnly} onCompleted={onRefresh} /> : null}
        {selected ? <RelationOperations asset={selected} allAssets={allAssets} auth={auth} readOnly={readOnly} onCompleted={onRefresh} /> : null}
      </div>
      {readOnly ? (
        <StateMessage title="Read-only Assets workspace" tone="unavailable">
          Your Studio role can inspect semantic assets, retained versions, validation and runtime evidence but cannot register, replace, restore or relate sources.
        </StateMessage>
      ) : null}
    </CollectionTemplate>
  );
}
