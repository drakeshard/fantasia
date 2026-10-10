import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const source = resolve(here, "src");
const dist = resolve(here, "dist");
const storyPath = resolve(root, "content/narrative/story.json");
const productionPath = resolve(root, "content/narrative/story-production.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const story = JSON.parse(readFileSync(storyPath, "utf8"));
const production = JSON.parse(readFileSync(productionPath, "utf8"));
assert(story.schemaVersion === 1, "story.schemaVersion must be 1");
assert(story.project?.id === "fantasia", "story.project.id must be fantasia");
assert(Array.isArray(story.sagas) && story.sagas.length > 0, "story.sagas must be non-empty");
assert(production.schemaVersion === 1, "production.schemaVersion must be 1");
assert(production.beats && typeof production.beats === "object", "production.beats is required");

const seenIds = new Set();
for (const saga of story.sagas) {
  assert(typeof saga.id === "string" && saga.id, "every saga needs an id");
  assert(Array.isArray(saga.chapters), `${saga.id} chapters must be an array`);
  for (const chapter of saga.chapters) {
    assert(typeof chapter.id === "string" && chapter.id, "every chapter needs an id");
    assert(Array.isArray(chapter.nodes), `${chapter.id} nodes must be an array`);
    for (const node of chapter.nodes) {
      assert(typeof node.id === "string" && node.id, "every node needs an id");
      assert(!seenIds.has(node.id), `duplicate narrative id: ${node.id}`);
      seenIds.add(node.id);
      assert(Array.isArray(node.beats), `${node.id} beats must be an array`);
      let previousOrder = 0;
      for (const beat of node.beats) {
        assert(typeof beat.id === "string" && beat.id, `${node.id} beat needs an id`);
        assert(!seenIds.has(beat.id), `duplicate narrative id: ${beat.id}`);
        seenIds.add(beat.id);
        assert(
          Number.isInteger(beat.order) && beat.order > previousOrder,
          `${beat.id} order must increase`,
        );
        previousOrder = beat.order;
        for (const field of [
          "title",
          "presentation",
          "screenAction",
          "dialogueIntent",
          "playerControl",
          "trigger",
          "result",
        ]) {
          assert(
            typeof beat[field] === "string" && beat[field].trim(),
            `${beat.id}.${field} is required`,
          );
        }
      }
    }
  }
}

for (const [beatId, annotation] of Object.entries(production.beats)) {
  assert(seenIds.has(beatId), `production references unknown beat: ${beatId}`);
  const timing = annotation.timing;
  assert(
    timing && ["auto", "advance", "player"].includes(timing.mode),
    `${beatId}.timing.mode is invalid`,
  );
  if (timing.mode === "player") {
    assert(Number.isFinite(timing.minSeconds), `${beatId}.timing.minSeconds is required`);
    assert(Number.isFinite(timing.maxSeconds), `${beatId}.timing.maxSeconds is required`);
    assert(timing.maxSeconds >= timing.minSeconds, `${beatId}.timing range is invalid`);
  } else {
    assert(
      Number.isFinite(timing.estimatedSeconds),
      `${beatId}.timing.estimatedSeconds is required`,
    );
  }

  assert(Array.isArray(annotation.events), `${beatId}.events must be an array`);
  for (const [index, event] of annotation.events.entries()) {
    assert(
      typeof event.type === "string" && event.type,
      `${beatId}.events[${index}].type is required`,
    );
    assert(
      typeof event.text === "string" && event.text.trim(),
      `${beatId}.events[${index}].text is required`,
    );
  }

  const slots = annotation.staging?.slots ?? {};
  for (const slotName of ["left", "center", "right"]) {
    const slot = slots[slotName];
    if (!slot) continue;
    assert(
      typeof slot.character === "string" && slot.character.trim(),
      `${beatId}.staging.slots.${slotName}.character is required`,
    );
  }
}

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(source, dist, { recursive: true });
writeFileSync(resolve(dist, "story.json"), `${JSON.stringify(story, null, 2)}\n`);
writeFileSync(resolve(dist, "story-production.json"), `${JSON.stringify(production, null, 2)}\n`);
console.log(`Story Studio build complete: ${seenIds.size} narrative IDs validated.`);
