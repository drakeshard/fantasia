import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const virtualModuleId = "virtual:fantasia-story-content";
const resolvedVirtualModuleId = `\0${virtualModuleId}`;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const storyPath = resolve(repositoryRoot, "content/narrative/story.json");

const approvedStatuses = new Set(["approved", "production-ready"]);
const playerFacingTypes = new Set(["action", "dialogue", "thought", "narration"]);

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | undefined {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function approved(value: unknown): boolean {
  return typeof value === "string" && approvedStatuses.has(value);
}

export function buildApprovedChapterOneStoryContent(source: unknown) {
  const document = record(source);
  const sagas = Array.isArray(document?.sagas) ? document.sagas : [];
  const saga = sagas.map(record).find((candidate) => candidate?.id === "S01");
  const chapters = Array.isArray(saga?.chapters) ? saga.chapters : [];
  const chapter = chapters.map(record).find((candidate) => candidate?.id === "CH01");
  if (!chapter) throw new Error("Canonical story source is missing S01 / CH01");

  const chapterTitle = stringValue(chapter.title);
  if (!chapterTitle) throw new Error("Canonical CH01 title is missing");
  const nodes = Array.isArray(chapter.nodes) ? chapter.nodes : [];
  const output: Record<string, unknown> = {};

  for (const candidate of nodes.map(record)) {
    if (candidate?.type !== "story" || !approved(candidate.scriptStatus)) continue;
    const nodeId = stringValue(candidate.id);
    const nodeTitle = stringValue(candidate.title);
    const beats = Array.isArray(candidate.beats) ? candidate.beats.map(record) : [];
    if (
      !nodeId ||
      !nodeTitle ||
      beats.length === 0 ||
      beats.some((beat) => !approved(beat?.scriptStatus))
    ) {
      continue;
    }

    const events: UnknownRecord[] = [];
    const orderedBeats = [...beats].sort((left, right) => {
      const leftOrder = typeof left?.order === "number" ? left.order : 0;
      const rightOrder = typeof right?.order === "number" ? right.order : 0;
      return leftOrder - rightOrder;
    });

    for (const beat of orderedBeats) {
      const script = Array.isArray(beat?.script) ? beat.script.map(record) : [];
      for (const event of script) {
        const id = stringValue(event?.id);
        const type = stringValue(event?.type);
        const text = stringValue(event?.text);
        if (!id || !type || !text || !playerFacingTypes.has(type)) continue;
        const next: UnknownRecord = { id, type, text };
        if (type === "dialogue" || type === "thought") {
          const displayLabel = stringValue(event?.displayLabel);
          if (!displayLabel) continue;
          next.displayLabel = displayLabel;
        }
        events.push(next);
      }
    }

    if (events.length === 0) continue;
    const location = stringValue(candidate.location);
    const time = stringValue(candidate.time);
    const summary = stringValue(candidate.summary);
    output[nodeId] = {
      chapterTitle,
      nodeTitle,
      ...(location ? { location } : {}),
      ...(time ? { time } : {}),
      ...(summary ? { summary } : {}),
      events,
    };
  }

  return output;
}

export function fantasiaStoryContentPlugin(): Plugin {
  return {
    name: "fantasia-approved-ch01-story-content",
    resolveId(id) {
      return id === virtualModuleId ? resolvedVirtualModuleId : undefined;
    },
    load(id) {
      if (id !== resolvedVirtualModuleId) return undefined;
      const source = JSON.parse(readFileSync(storyPath, "utf8")) as unknown;
      const content = buildApprovedChapterOneStoryContent(source);
      return `export default ${JSON.stringify(content)};`;
    },
  };
}
