import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = async (relativePath) =>
  JSON.parse(await readFile(path.join(root, relativePath), "utf8"));

const [story, storyProduction, encounter, runtimeManifest] = await Promise.all([
  source("content/narrative/story.json"),
  source("content/narrative/story-production.json"),
  source("content/encounters/candidates/ch01-b01.layout-candidate.json"),
  source("config/runtime-assets.json"),
]);

const beatIds = new Set();
const projectedStory = {
  schemaVersion: story.schemaVersion,
  project: story.project,
  sagas: story.sagas.map((saga) => ({
    id: saga.id,
    title: saga.title,
    chapters: saga.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      status: chapter.status,
      nodes: chapter.nodes.map((node) => ({
        id: node.id,
        title: node.title,
        type: node.type,
        status: node.status,
        scriptStatus: node.scriptStatus,
        location: node.location,
        time: node.time,
        summary: node.summary,
        beats: (node.beats ?? []).map((beat) => {
          beatIds.add(beat.id);
          return { id: beat.id };
        }),
      })),
    })),
  })),
};

const productionBeats = Object.fromEntries(
  Object.entries(storyProduction.beats ?? {}).filter(([beatId]) => beatIds.has(beatId)),
);

const projectedEncounter = {
  id: encounter.id,
  stageId: encounter.stageId,
  title: encounter.title,
  status: encounter.status,
  gameD222Compliance: encounter.gameD222Compliance,
  bounds: encounter.bounds,
  environmentIntent: encounter.environmentIntent,
  terrain: encounter.terrain,
  cart: encounter.cart,
  deployment: encounter.deployment,
  phaseAnnotations: encounter.phaseAnnotations,
};

const revision = process.env.CANONICAL_GIT_REVISION?.trim();
if (!revision) throw new Error("CANONICAL_GIT_REVISION is required.");

const snapshot = {
  revision,
  story: projectedStory,
  storyProduction: {
    profile: storyProduction.profile ?? null,
    beats: productionBeats,
  },
  encounter: projectedEncounter,
  runtimeManifest,
};

const output = path.join(
  root,
  "supabase/functions/studio-operations/canonical-snapshot.generated.json",
);
const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

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
