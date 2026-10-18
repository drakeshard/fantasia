import type {
  RegistryAssetVersionRecord,
  RegistrySnapshot,
  RuntimeManifestSnapshot,
  StudioAssetSourceSummary,
  StudioCanonicalSummary,
  StudioProvenance,
} from "../../../packages/studio-read-model/src/index.ts";

const REPOSITORY = "drakeshard/fantasia";
const DEFAULT_REF = "main";
const STORY_PATH = "content/narrative/story.json";
const STORY_PRODUCTION_PATH = "content/narrative/story-production.json";
const ENCOUNTER_PATH = "content/encounters/candidates/ch01-b01.layout-candidate.json";
const RUNTIME_MANIFEST_PATH = "config/runtime-assets.json";

export interface AssetSourceProviderAdapter {
  readonly kind: string;
  describe(version: RegistryAssetVersionRecord, exposeReference: boolean): StudioAssetSourceSummary;
}

export class RegistryBackedAssetSourceAdapter implements AssetSourceProviderAdapter {
  constructor(readonly kind: string) {}

  describe(version: RegistryAssetVersionRecord, exposeReference: boolean): StudioAssetSourceSummary {
    return {
      semanticAssetId: version.asset_id,
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
      checksum: { algorithm: version.checksum_algorithm, value: version.checksum },
      providerReference: exposeReference
        ? { visibility: "opaque", token: version.provider_ref }
        : { visibility: "redacted" },
      operations: ["metadata"],
      provenance: {
        authority: "provider",
        source: version.provider_kind,
        observedAt: version.updated_at,
        canonical: true,
      },
    };
  }
}

interface GitSnapshot {
  readonly revision: string;
  readonly story: unknown;
  readonly storyProduction: unknown;
  readonly encounter: unknown;
  readonly runtimeManifest: unknown;
}

interface StoryNode {
  readonly id?: unknown;
  readonly title?: unknown;
  readonly type?: unknown;
  readonly status?: unknown;
  readonly scriptStatus?: unknown;
  readonly location?: unknown;
  readonly time?: unknown;
  readonly summary?: unknown;
  readonly beats?: unknown;
}

interface StoryChapter {
  readonly id?: unknown;
  readonly nodes?: unknown;
}

interface StorySaga {
  readonly id?: unknown;
  readonly chapters?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} is malformed.`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${label} is malformed.`);
  return value;
}

function semanticPart(value: string): string {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function fetchJsonAtRevision(path: string, revision: string): Promise<unknown> {
  const response = await fetch(`https://raw.githubusercontent.com/${REPOSITORY}/${revision}/${path}`, {
    headers: { accept: "application/json", "user-agent": "fantasia-content-studio" },
  });
  if (!response.ok) throw new Error(`Canonical Git source unavailable: ${path} (${response.status}).`);
  try {
    return await response.json();
  } catch {
    throw new Error(`Canonical Git source malformed: ${path}.`);
  }
}

export async function loadGitSnapshot(ref = DEFAULT_REF): Promise<GitSnapshot> {
  const branchResponse = await fetch(`https://api.github.com/repos/${REPOSITORY}/commits/${encodeURIComponent(ref)}`, {
    headers: { accept: "application/vnd.github+json", "user-agent": "fantasia-content-studio" },
  });
  if (!branchResponse.ok) throw new Error(`Unable to resolve canonical Git revision (${branchResponse.status}).`);
  const branch = requireRecord(await branchResponse.json(), "Git revision response");
  const revision = requireString(branch.sha, "Git revision");
  const [story, storyProduction, encounter, runtimeManifest] = await Promise.all([
    fetchJsonAtRevision(STORY_PATH, revision),
    fetchJsonAtRevision(STORY_PRODUCTION_PATH, revision),
    fetchJsonAtRevision(ENCOUNTER_PATH, revision),
    fetchJsonAtRevision(RUNTIME_MANIFEST_PATH, revision),
  ]);
  return { revision, story, storyProduction, encounter, runtimeManifest };
}

function gitProvenance(path: string, revision: string, canonical: boolean): StudioProvenance {
  return { authority: "git", source: path, revision, canonical };
}

function productionPreviewFor(beatIds: readonly string[], production: Record<string, unknown>, revision: string): StudioCanonicalSummary["preview"] | undefined {
  const beats = isRecord(production.beats) ? production.beats : {};
  const selected: Record<string, unknown> = {};
  for (const beatId of beatIds) {
    if (Object.hasOwn(beats, beatId)) selected[beatId] = beats[beatId];
  }
  if (Object.keys(selected).length === 0) return undefined;
  return {
    data: { profile: production.profile ?? null, beats: selected },
    provenance: gitProvenance(STORY_PRODUCTION_PATH, revision, false),
  };
}

export function normalizeCanonicalModels(snapshot: GitSnapshot): readonly StudioCanonicalSummary[] {
  const story = requireRecord(snapshot.story, "Story source");
  const production = requireRecord(snapshot.storyProduction, "Story production preview");
  if (!Array.isArray(story.sagas)) throw new Error("Story source is malformed: sagas are required.");
  const models: StudioCanonicalSummary[] = [];

  for (const sagaValue of story.sagas) {
    const saga = requireRecord(sagaValue, "Story saga") as StorySaga;
    const sagaId = requireString(saga.id, "Story saga id");
    if (!Array.isArray(saga.chapters)) throw new Error(`Story saga ${sagaId} chapters are malformed.`);
    for (const chapterValue of saga.chapters) {
      const chapter = requireRecord(chapterValue, "Story chapter") as StoryChapter;
      const chapterId = requireString(chapter.id, "Story chapter id");
      if (!Array.isArray(chapter.nodes)) throw new Error(`Story chapter ${chapterId} nodes are malformed.`);
      for (const nodeValue of chapter.nodes) {
        const node = requireRecord(nodeValue, "Story node") as StoryNode;
        const nodeId = requireString(node.id, "Story node id");
        const title = requireString(node.title, `Story node ${nodeId} title`);
        const beatIds = Array.isArray(node.beats)
          ? node.beats.flatMap((beat) => {
              const record = isRecord(beat) ? beat : null;
              return record && typeof record.id === "string" ? [record.id] : [];
            })
          : [];
        const semanticId = `story.${semanticPart(sagaId)}.${semanticPart(chapterId)}.${semanticPart(nodeId)}`;
        models.push({
          semanticId,
          entityType: "story",
          displayName: title,
          canonicalPath: STORY_PATH,
          canonicalData: {
            sagaId,
            chapterId,
            nodeId,
            title,
            type: node.type ?? null,
            status: node.status ?? null,
            scriptStatus: node.scriptStatus ?? null,
            location: node.location ?? null,
            time: node.time ?? null,
            summary: node.summary ?? null,
            beats: node.beats ?? [],
          },
          provenance: gitProvenance(STORY_PATH, snapshot.revision, true),
          preview: productionPreviewFor(beatIds, production, snapshot.revision),
        });
      }
    }
  }

  const encounter = requireRecord(snapshot.encounter, "Encounter candidate");
  const stageId = requireString(encounter.stageId, "Encounter stage id");
  const title = requireString(encounter.title, "Encounter title");
  models.push({
    semanticId: `map.s01.ch01.${semanticPart(stageId.replace(/^CH01-/i, ""))}`,
    entityType: "map-encounter",
    displayName: title,
    canonicalPath: ENCOUNTER_PATH,
    canonicalData: {
      id: encounter.id ?? null,
      stageId,
      title,
      status: encounter.status ?? null,
      gameD222Compliance: encounter.gameD222Compliance ?? null,
      bounds: encounter.bounds ?? null,
      environmentIntent: encounter.environmentIntent ?? null,
      terrain: encounter.terrain ?? null,
      cart: encounter.cart ?? null,
      deployment: encounter.deployment ?? null,
      phaseAnnotations: encounter.phaseAnnotations ?? null,
    },
    provenance: gitProvenance(ENCOUNTER_PATH, snapshot.revision, true),
  });

  return models;
}

export function normalizeRuntimeManifest(snapshot: GitSnapshot): RuntimeManifestSnapshot {
  const manifest = requireRecord(snapshot.runtimeManifest, "Runtime asset manifest");
  if (!Array.isArray(manifest.assets) || typeof manifest.schemaVersion !== "number") {
    throw new Error("Runtime asset manifest is malformed.");
  }
  const assets = manifest.assets.map((value) => {
    const entry = requireRecord(value, "Runtime asset manifest entry");
    return {
      id: requireString(entry.id, "Runtime asset id"),
      path: requireString(entry.path, "Runtime asset path"),
      mediaType: requireString(entry.mediaType, "Runtime asset media type"),
      version: typeof entry.version === "number" ? entry.version : 0,
    };
  });
  return {
    schemaVersion: manifest.schemaVersion,
    revision: snapshot.revision,
    path: RUNTIME_MANIFEST_PATH,
    assets,
  };
}

export function redactRegistryProviderReferences(snapshot: RegistrySnapshot): RegistrySnapshot {
  return {
    ...snapshot,
    assetVersions: snapshot.assetVersions.map((version) => ({ ...version, provider_ref: version.provider_ref ? "[registered]" : "" })),
  };
}
