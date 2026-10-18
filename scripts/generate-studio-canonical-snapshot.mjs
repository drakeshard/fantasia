import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = async (relativePath) =>
  JSON.parse(await readFile(path.join(root, relativePath), "utf8"));

const STORY_PATH = "content/narrative/story.json";
const STORY_PRODUCTION_PATH = "content/narrative/story-production.json";
const ENCOUNTER_PATH = "content/encounters/candidates/ch01-b01.layout-candidate.json";
const RUNTIME_MANIFEST_PATH = "config/runtime-assets.json";

const [story, storyProduction, encounter, runtimeManifest] = await Promise.all([
  source(STORY_PATH),
  source(STORY_PRODUCTION_PATH),
  source(ENCOUNTER_PATH),
  source(RUNTIME_MANIFEST_PATH),
]);

const revision = process.env.CANONICAL_GIT_REVISION?.trim();
if (!revision) throw new Error("CANONICAL_GIT_REVISION is required.");

const semanticPart = (value) =>
  value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const gitProvenance = (sourcePath, canonical) => ({
  authority: "git",
  source: sourcePath,
  revision,
  canonical,
});

const canonicalModels = [];
for (const saga of story.sagas) {
  for (const chapter of saga.chapters) {
    for (const node of chapter.nodes) {
      const hasProductionPreview = (node.beats ?? []).some((beat) =>
        Object.hasOwn(storyProduction.beats ?? {}, beat.id),
      );
      canonicalModels.push({
        semanticId: `story.${semanticPart(saga.id)}.${semanticPart(chapter.id)}.${semanticPart(node.id)}`,
        entityType: "story",
        displayName: node.title,
        canonicalPath: STORY_PATH,
        canonicalData: {
          sagaId: saga.id,
          chapterId: chapter.id,
          nodeId: node.id,
          title: node.title,
          type: node.type ?? null,
          status: node.status ?? null,
          scriptStatus: node.scriptStatus ?? null,
        },
        provenance: gitProvenance(STORY_PATH, true),
        ...(hasProductionPreview
          ? {
              preview: {
                data: { profile: storyProduction.profile ?? null, available: true },
                provenance: gitProvenance(STORY_PRODUCTION_PATH, false),
              },
            }
          : {}),
      });
    }
  }
}

canonicalModels.push({
  semanticId: `map.s01.ch01.${semanticPart(encounter.stageId.replace(/^CH01-/i, ""))}`,
  entityType: "map-encounter",
  displayName: encounter.title,
  canonicalPath: ENCOUNTER_PATH,
  canonicalData: {
    id: encounter.id ?? null,
    stageId: encounter.stageId,
    title: encounter.title,
    status: encounter.status ?? null,
    gameD222Compliance: encounter.gameD222Compliance ?? null,
  },
  provenance: gitProvenance(ENCOUNTER_PATH, true),
});

const snapshot = {
  revision,
  canonicalModels,
  runtimeManifest: {
    schemaVersion: runtimeManifest.schemaVersion,
    revision,
    path: RUNTIME_MANIFEST_PATH,
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
    throw new Error("Studio canonical deployment snapshot is stale. Regenerate it from Git sources.");
  }
  console.log("Studio canonical deployment snapshot is current.");
} else {
  await writeFile(output, serialized, "utf8");
  console.log(`Wrote ${path.relative(root, output)}.`);
}
