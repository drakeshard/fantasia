import type {
  RuntimeManifestSnapshot,
  StudioCanonicalSummary,
} from "../../../packages/studio-read-model/src/index.ts";
import snapshot from "./canonical-snapshot.generated.json" with { type: "json" };

const STORY_PATH = "content/narrative/story.json";
const STORY_PRODUCTION_PATH = "content/narrative/story-production.json";
const CHARACTER_PATH = "content/characters/characters.json";
const ENCOUNTER_PATH = "content/encounters/candidates/ch01-b01.layout-candidate.json";
const RUNTIME_MANIFEST_PATH = "config/runtime-assets.json";

type StoryRow = readonly [
  semanticId: string,
  title: string,
  sagaId: string,
  chapterId: string,
  nodeId: string,
  nodeType: string | null,
  status: string | null,
  scriptStatus: string | null,
  hasProductionPreview: boolean,
];

type CharacterRow = readonly [
  semanticId: string,
  displayName: string,
  actorId: string | null,
  tacticalEntityId: string | null,
  side: string | null,
  shortLabel: string | null,
  movementAllowance: number | null,
  initialCoord: Readonly<{ x: number; y: number }> | null,
  rpg: Readonly<Record<string, unknown>> | null,
];

type EncounterRow = readonly [
  semanticId: string,
  title: string,
  id: string | null,
  stageId: string,
  status: string | null,
  gameD222Compliance: unknown,
];

interface CompactRepositorySnapshot {
  readonly revision: string;
  readonly previewProfile: string | null;
  readonly storyRows: readonly StoryRow[];
  readonly characterRows: readonly CharacterRow[];
  readonly encounter: EncounterRow;
  readonly runtimeManifest: {
    readonly schemaVersion: number;
    readonly assets: RuntimeManifestSnapshot["assets"];
  };
}

export interface RepositoryReadSnapshot {
  readonly revision: string;
  readonly canonicalModels: readonly StudioCanonicalSummary[];
  readonly runtimeManifest: RuntimeManifestSnapshot;
}

function gitProvenance(source: string, revision: string, canonical: boolean) {
  return { authority: "git" as const, source, revision, canonical };
}

// This compact deployment snapshot is mechanically projected from Git-owned canonical
// sources by scripts/generate-studio-canonical-snapshot.mjs. Its revision records the
// repository state represented by the bundled read projection.
export function loadRepositorySnapshot(): RepositoryReadSnapshot {
  const compact = snapshot as CompactRepositorySnapshot;
  const canonicalModels: StudioCanonicalSummary[] = compact.storyRows.map((row) => {
    const [
      semanticId,
      title,
      sagaId,
      chapterId,
      nodeId,
      nodeType,
      status,
      scriptStatus,
      hasProductionPreview,
    ] = row;
    return {
      semanticId,
      entityType: "story",
      displayName: title,
      canonicalPath: STORY_PATH,
      canonicalData: { sagaId, chapterId, nodeId, title, type: nodeType, status, scriptStatus },
      provenance: gitProvenance(STORY_PATH, compact.revision, true),
      ...(hasProductionPreview
        ? {
            preview: {
              data: { profile: compact.previewProfile, available: true },
              provenance: gitProvenance(STORY_PRODUCTION_PATH, compact.revision, false),
            },
          }
        : {}),
    };
  });

  for (const row of compact.characterRows) {
    const [
      semanticId,
      displayName,
      actorId,
      tacticalEntityId,
      side,
      shortLabel,
      movementAllowance,
      initialCoord,
      rpg,
    ] = row;
    canonicalModels.push({
      semanticId,
      entityType: "character",
      displayName,
      canonicalPath: CHARACTER_PATH,
      canonicalData: {
        semanticId,
        actorId,
        tacticalEntityId,
        displayName,
        side,
        shortLabel,
        movementAllowance,
        initialCoord,
        rpg,
      },
      provenance: gitProvenance(CHARACTER_PATH, compact.revision, true),
    });
  }

  const [semanticId, title, id, stageId, status, gameD222Compliance] = compact.encounter;
  canonicalModels.push({
    semanticId,
    entityType: "map-encounter",
    displayName: title,
    canonicalPath: ENCOUNTER_PATH,
    canonicalData: { id, stageId, title, status, gameD222Compliance },
    provenance: gitProvenance(ENCOUNTER_PATH, compact.revision, true),
  });

  return {
    revision: compact.revision,
    canonicalModels,
    runtimeManifest: {
      schemaVersion: compact.runtimeManifest.schemaVersion,
      revision: compact.revision,
      path: RUNTIME_MANIFEST_PATH,
      assets: compact.runtimeManifest.assets,
    },
  };
}
