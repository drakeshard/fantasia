import { describe, expect, it } from "vitest";
import {
  composeStudioEntity,
  permissionPresentation,
  searchStudioEntities,
  type RegistrySnapshot,
  type RuntimeManifestSnapshot,
  type StudioCanonicalSummary,
} from "../../packages/studio-read-model/src/index.ts";
import {
  normalizeCanonicalModels,
  normalizeRuntimeManifest,
  RegistryBackedAssetSourceAdapter,
} from "../../supabase/functions/studio-operations/read-model-adapters.ts";
import { registryOnlyReadModels } from "../../supabase/functions/studio-operations/missing-canonical.ts";

const permissions = permissionPresentation("Viewer", ["studio.read"]);
const runtimeManifest: RuntimeManifestSnapshot = {
  schemaVersion: 1,
  revision: "abc123",
  path: "config/runtime-assets.json",
  assets: [{ id: "asset.hero", path: "units/hero.webp", mediaType: "image/webp", version: 1 }],
};

function registry(overrides: Partial<RegistrySnapshot> = {}): RegistrySnapshot {
  return {
    observedAt: "2026-10-18T00:00:00Z",
    contentEntities: [],
    assets: [],
    assetVersions: [],
    entityRelations: [],
    runtimeDerivatives: [],
    validationResults: [],
    changeEvents: [],
    ...overrides,
  };
}

const canonical: StudioCanonicalSummary = {
  semanticId: "story.s01.ch01.ch01-n01",
  entityType: "story",
  displayName: "Canonical Git Title",
  canonicalPath: "content/narrative/story.json",
  canonicalData: { title: "Canonical Git Title", balance: 42 },
  provenance: {
    authority: "git",
    source: "content/narrative/story.json",
    revision: "abc123",
    canonical: true,
  },
};

describe("Studio read-model composition", () => {
  it("keeps canonical Git values authoritative over conflicting registry display/cache metadata", () => {
    const model = composeStudioEntity({
      canonical,
      registry: registry({
        contentEntities: [
          {
            semantic_id: canonical.semanticId,
            entity_type: "story",
            display_label: "Conflicting registry title",
            canonical_git_path: canonical.canonicalPath,
            schema_version: 3,
            lifecycle: "APPROVED",
            metadata: { title: "Wrong registry cache", balance: 999 },
          },
        ],
      }),
      runtimeManifest,
      permissions,
    });

    expect(model.displayName).toBe("Canonical Git Title");
    expect(model.canonical.canonicalData.balance).toBe(42);
    expect(model.lifecycle).toBe("APPROVED");
    expect(model.schemaVersion).toBe(3);
  });

  it("represents approved lifecycle together with blocking validation instead of hiding the conflict", () => {
    const model = composeStudioEntity({
      canonical,
      registry: registry({
        contentEntities: [
          {
            semantic_id: canonical.semanticId,
            entity_type: "story",
            display_label: null,
            canonical_git_path: canonical.canonicalPath,
            schema_version: 1,
            lifecycle: "APPROVED",
            metadata: {},
          },
        ],
        validationResults: [
          {
            id: "v1",
            entity_id: canonical.semanticId,
            asset_id: null,
            asset_version_id: null,
            runtime_derivative_id: null,
            dimension: "Source Valid",
            outcome: "FAILED",
            is_blocking: true,
            checked_at: "2026-10-18T00:00:00Z",
          },
        ],
      }),
      runtimeManifest,
      permissions,
    });

    expect(model.lifecycle).toBe("APPROVED");
    expect(model.validations[0]?.blocking).toBe(true);
    expect(model.issues.some((issue) => issue.code === "validation-blocking")).toBe(true);
  });

  it("keeps semantic asset identity stable when provider references migrate", () => {
    const adapter = new RegistryBackedAssetSourceAdapter("google-drive");
    const base = {
      id: "version-1",
      asset_id: "asset.hero",
      version_number: 1,
      lifecycle: "WORKING",
      provider_kind: "google-drive",
      media_type: "image/png",
      width_px: 100,
      height_px: 200,
      byte_size: 1234,
      checksum_algorithm: "sha256",
      checksum: "deadbeef",
    } as const;
    const first = adapter.describe({ ...base, provider_ref: "drive-file-A" }, false);
    const migrated = adapter.describe({ ...base, provider_kind: "future-provider", provider_ref: "object-B" }, false);

    expect(first.semanticAssetId).toBe("asset.hero");
    expect(migrated.semanticAssetId).toBe("asset.hero");
    expect(first.providerReference).toEqual({ visibility: "redacted" });
    expect(migrated.providerReference).toEqual({ visibility: "redacted" });
  });

  it("keeps Story production data explicitly non-canonical", () => {
    const models = normalizeCanonicalModels({
      revision: "abc123",
      story: {
        sagas: [
          {
            id: "S01",
            chapters: [
              {
                id: "CH01",
                nodes: [
                  {
                    id: "CH01-N01",
                    title: "The Other Side",
                    type: "story",
                    status: "approved-structure",
                    scriptStatus: "approved",
                    beats: [{ id: "CH01-N01-BEAT-01", script: [{ text: "canonical line" }] }],
                  },
                ],
              },
            ],
          },
        ],
      },
      storyProduction: {
        profile: "preview-v1",
        beats: { "CH01-N01-BEAT-01": { staging: { camera: "preview only" } } },
      },
      encounter: {
        id: "CH01-B01-LAYOUT-CANDIDATE-v001",
        stageId: "CH01-B01",
        title: "Strangers on the Road",
        status: "provisional-layout-candidate",
      },
      runtimeManifest: { schemaVersion: 1, assets: [] },
    });
    const story = models.find((model) => model.entityType === "story");

    expect(story?.provenance.canonical).toBe(true);
    expect(story?.provenance.source).toBe("content/narrative/story.json");
    expect(story?.preview?.provenance.canonical).toBe(false);
    expect(story?.preview?.provenance.source).toBe("content/narrative/story-production.json");
  });

  it("surfaces registry entities with missing canonical sources", () => {
    const partial = registryOnlyReadModels(
      registry({
        contentEntities: [
          {
            semantic_id: "character.missing",
            entity_type: "character",
            display_label: "Missing Hero",
            canonical_git_path: "content/characters/missing.json",
            schema_version: 1,
            lifecycle: "WORKING",
            metadata: {},
          },
        ],
      }),
      new Set<string>(),
      runtimeManifest,
      permissions,
    );

    expect(partial[0]?.issues[0]?.code).toBe("canonical-unavailable");
    expect(partial[0]?.issues[0]?.severity).toBe("blocking");
  });

  it("normalizes the runtime manifest read-only and searches deterministically", () => {
    const manifest = normalizeRuntimeManifest({
      revision: "def456",
      story: {},
      storyProduction: {},
      encounter: {},
      runtimeManifest: {
        schemaVersion: 1,
        assets: [{ id: "ui.icon.home", path: "ui/home.svg", mediaType: "image/svg+xml", version: 1 }],
      },
    });
    expect(manifest.path).toBe("config/runtime-assets.json");
    expect(manifest.assets[0]?.id).toBe("ui.icon.home");

    const a = composeStudioEntity({ canonical: { ...canonical, semanticId: "story.z", displayName: "Zulu" }, registry: registry(), runtimeManifest, permissions });
    const b = composeStudioEntity({ canonical: { ...canonical, semanticId: "story.a", displayName: "Alpha" }, registry: registry(), runtimeManifest, permissions });
    const result = searchStudioEntities([a, b], { text: "", limit: 50 });
    expect(result.rows.map((row) => row.semanticId)).toEqual(["story.a", "story.z"]);
  });
});
