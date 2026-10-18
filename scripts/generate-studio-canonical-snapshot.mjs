import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = async (relativePath) =>
  JSON.parse(await readFile(path.join(root, relativePath), "utf8"));

const STORY_PATH = "content/narrative/story.json";
const STORY_PRODUCTION_PATH = "content/narrative/story-production.json";
const CHARACTER_PATH = "content/characters/characters.json";
const ENCOUNTER_PATH = "content/encounters/candidates/ch01-b01.layout-candidate.json";
const RUNTIME_MANIFEST_PATH = "config/runtime-assets.json";

const [story, storyProduction, characters, encounter, runtimeManifest] = await Promise.all([
  source(STORY_PATH),
  source(STORY_PRODUCTION_PATH),
  source(CHARACTER_PATH),
  source(ENCOUNTER_PATH),
  source(RUNTIME_MANIFEST_PATH),
]);

const revision = process.env.CANONICAL_GIT_REVISION?.trim();
if (!revision) throw new Error("CANONICAL_GIT_REVISION is required.");

const semanticPart = (value) =>
  value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const storyRows = [];
for (const saga of story.sagas) {
  for (const chapter of saga.chapters) {
    for (const node of chapter.nodes) {
      const hasProductionPreview = (node.beats ?? []).some((beat) =>
        Object.hasOwn(storyProduction.beats ?? {}, beat.id),
      );
      storyRows.push([
        `story.${semanticPart(saga.id)}.${semanticPart(chapter.id)}.${semanticPart(node.id)}`,
        node.title,
        saga.id,
        chapter.id,
        node.id,
        node.type ?? null,
        node.status ?? null,
        node.scriptStatus ?? null,
        hasProductionPreview,
      ]);
    }
  }
}

if (characters.schemaVersion !== 1 || !Array.isArray(characters.characters)) {
  throw new Error("Canonical character source is malformed.");
}
const seenCharacterIds = new Set();
const characterRows = characters.characters.map((character) => {
  if (
    typeof character.semanticId !== "string" ||
    !character.semanticId.startsWith("character.") ||
    seenCharacterIds.has(character.semanticId) ||
    typeof character.displayName !== "string" ||
    !character.displayName.trim()
  ) {
    throw new Error("Canonical character source contains an invalid semantic identity.");
  }
  seenCharacterIds.add(character.semanticId);
  return [
    character.semanticId,
    character.displayName,
    character.actorId ?? null,
    character.tacticalEntityId ?? null,
    character.side ?? null,
    character.shortLabel ?? null,
    character.movementAllowance ?? null,
    character.initialCoord ?? null,
    character.rpg ?? null,
  ];
});

const snapshot = {
  revision,
  previewProfile: storyProduction.profile ?? null,
  storyRows,
  characterRows,
  encounter: [
    `map.s01.ch01.${semanticPart(encounter.stageId.replace(/^CH01-/i, ""))}`,
    encounter.title,
    encounter.id ?? null,
    encounter.stageId,
    encounter.status ?? null,
    encounter.gameD222Compliance ?? null,
  ],
  runtimeManifest: {
    schemaVersion: runtimeManifest.schemaVersion,
    assets: runtimeManifest.assets,
  },
};

const output = path.join(
  root,
  "supabase/functions/studio-operations/canonical-snapshot.generated.json",
);
const serialized = `${JSON.stringify(snapshot)}\n`;

if (process.argv.includes("--check")) {
  const existing = await readFile(output, "utf8").catch(() => "");
  if (existing !== serialized) {
    throw new Error(
      "Studio canonical deployment snapshot is stale. Regenerate it from Git sources.",
    );
  }
  console.log("Studio canonical deployment snapshot is current.");
} else {
  await writeFile(output, serialized, "utf8");
  console.log(`Wrote ${path.relative(root, output)}.`);
}
