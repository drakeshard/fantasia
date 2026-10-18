export const CANONICAL_STORY_PATH = "content/narrative/story.json" as const;
export const CANONICAL_STORY_NODE_CONTENT_TYPE = "fantasia.story.node.v1" as const;
export const CANONICAL_STORY_NODE_OPERATION = "set-node-summary" as const;

export type StoryNodeSummaryChange = {
  readonly kind: typeof CANONICAL_STORY_NODE_OPERATION;
  readonly summary: string;
};

export type CanonicalStoryNodeChangeRequest = {
  readonly semanticId: string;
  readonly canonicalPath: typeof CANONICAL_STORY_PATH;
  readonly contentType: typeof CANONICAL_STORY_NODE_CONTENT_TYPE;
  readonly baseRevision: string;
  readonly operation: StoryNodeSummaryChange;
  readonly changeSummary: string;
};

export type CanonicalChangeValidationResult = {
  readonly content: string;
  readonly previousSummary: string | null;
  readonly nextSummary: string;
  readonly stableIds: readonly string[];
};

export class CanonicalChangeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CanonicalChangeValidationError";
  }
}

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new CanonicalChangeValidationError(message);
}

function nonEmptyText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validateScriptEvent(event: unknown, label: string, scriptIds: Set<string>): void {
  assert(isObject(event), `${label} must be an object.`);
  assert(nonEmptyText(event.id), `${label}.id is required.`);
  assert(!scriptIds.has(event.id), `Duplicate script event id: ${event.id}.`);
  scriptIds.add(event.id);
  assert(
    ["action", "dialogue", "thought", "narration", "control", "transition"].includes(
      String(event.type),
    ),
    `${label}.type is invalid.`,
  );
  assert(nonEmptyText(event.text), `${label}.text is required.`);
  if (event.type === "dialogue" || event.type === "thought") {
    assert(nonEmptyText(event.speaker), `${label}.speaker is required.`);
    assert(nonEmptyText(event.displayLabel), `${label}.displayLabel is required.`);
  }
}

export function validateCanonicalStory(value: unknown): readonly string[] {
  assert(isObject(value), "Story root must be an object.");
  assert(value.schemaVersion === 1, "story.schemaVersion must be 1.");
  assert(isObject(value.project) && value.project.id === "fantasia", "story.project.id must be fantasia.");
  assert(Array.isArray(value.sagas) && value.sagas.length > 0, "story.sagas must be non-empty.");

  const stableIds: string[] = [];
  const narrativeIds = new Set<string>();
  const scriptIds = new Set<string>();

  for (const [sagaIndex, sagaValue] of value.sagas.entries()) {
    assert(isObject(sagaValue), `story.sagas[${sagaIndex}] must be an object.`);
    assert(nonEmptyText(sagaValue.id), `story.sagas[${sagaIndex}].id is required.`);
    assert(Array.isArray(sagaValue.chapters), `${sagaValue.id}.chapters must be an array.`);

    for (const [chapterIndex, chapterValue] of sagaValue.chapters.entries()) {
      assert(isObject(chapterValue), `${sagaValue.id}.chapters[${chapterIndex}] must be an object.`);
      assert(nonEmptyText(chapterValue.id), `Every chapter needs an id.`);
      assert(Array.isArray(chapterValue.nodes), `${chapterValue.id}.nodes must be an array.`);
      const chapterNodeIds = new Set(
        chapterValue.nodes
          .filter(isObject)
          .map((node) => node.id)
          .filter((id): id is string => typeof id === "string"),
      );

      if (chapterValue.routeClusters !== undefined) {
        assert(Array.isArray(chapterValue.routeClusters), `${chapterValue.id}.routeClusters must be an array.`);
        for (const clusterValue of chapterValue.routeClusters) {
          assert(isObject(clusterValue), `${chapterValue.id} route cluster must be an object.`);
          assert(nonEmptyText(clusterValue.id), `${chapterValue.id} route cluster needs an id.`);
          assert(clusterValue.mode === "complete-any", `${clusterValue.id}.mode must be complete-any.`);
          assert(
            Array.isArray(clusterValue.nodeIds) && clusterValue.nodeIds.length > 0,
            `${clusterValue.id}.nodeIds must be non-empty.`,
          );
          assert(
            Number.isInteger(clusterValue.requiredCount) &&
              (clusterValue.requiredCount as number) > 0 &&
              (clusterValue.requiredCount as number) <= clusterValue.nodeIds.length,
            `${clusterValue.id}.requiredCount is invalid.`,
          );
          assert(nonEmptyText(clusterValue.reconvergesAt), `${clusterValue.id}.reconvergesAt is required.`);
          for (const routeNodeId of clusterValue.nodeIds) {
            assert(
              typeof routeNodeId === "string" && chapterNodeIds.has(routeNodeId),
              `${clusterValue.id} references unknown node: ${String(routeNodeId)}.`,
            );
          }
          assert(
            chapterNodeIds.has(clusterValue.reconvergesAt),
            `${clusterValue.id} reconverges at unknown node: ${clusterValue.reconvergesAt}.`,
          );
        }
      }

      for (const nodeValue of chapterValue.nodes) {
        assert(isObject(nodeValue), `${chapterValue.id} node must be an object.`);
        assert(nonEmptyText(nodeValue.id), "Every node needs an id.");
        assert(!narrativeIds.has(nodeValue.id), `Duplicate narrative id: ${nodeValue.id}.`);
        narrativeIds.add(nodeValue.id);
        stableIds.push(nodeValue.id);
        assert(Array.isArray(nodeValue.beats), `${nodeValue.id}.beats must be an array.`);
        if (nodeValue.scriptStatus !== undefined) {
          assert(
            ["draft", "proposed", "approved", "production-ready"].includes(
              String(nodeValue.scriptStatus),
            ),
            `${nodeValue.id}.scriptStatus is invalid.`,
          );
        }

        let previousOrder = 0;
        for (const beatValue of nodeValue.beats) {
          assert(isObject(beatValue), `${nodeValue.id} beat must be an object.`);
          assert(nonEmptyText(beatValue.id), `${nodeValue.id} beat needs an id.`);
          assert(!narrativeIds.has(beatValue.id), `Duplicate narrative id: ${beatValue.id}.`);
          narrativeIds.add(beatValue.id);
          stableIds.push(beatValue.id);
          assert(
            Number.isInteger(beatValue.order) && (beatValue.order as number) > previousOrder,
            `${beatValue.id}.order must increase.`,
          );
          previousOrder = beatValue.order as number;
          for (const field of [
            "title",
            "presentation",
            "screenAction",
            "dialogueIntent",
            "playerControl",
            "trigger",
            "result",
          ]) {
            assert(nonEmptyText(beatValue[field]), `${beatValue.id}.${field} is required.`);
          }

          if (beatValue.script !== undefined) {
            assert(Array.isArray(beatValue.script) && beatValue.script.length > 0, `${beatValue.id}.script must be non-empty.`);
            assert(
              ["draft", "proposed", "approved", "production-ready"].includes(
                String(beatValue.scriptStatus),
              ),
              `${beatValue.id}.scriptStatus is required when script exists.`,
            );
            for (const [eventIndex, event] of beatValue.script.entries()) {
              validateScriptEvent(event, `${beatValue.id}.script[${eventIndex}]`, scriptIds);
            }
          }
        }
      }
    }
  }

  return stableIds;
}

function cloneJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

export function applyStoryNodeSummaryChange(
  currentStory: unknown,
  request: CanonicalStoryNodeChangeRequest,
): CanonicalChangeValidationResult {
  if (
    request.canonicalPath !== CANONICAL_STORY_PATH ||
    request.contentType !== CANONICAL_STORY_NODE_CONTENT_TYPE ||
    request.operation.kind !== CANONICAL_STORY_NODE_OPERATION
  ) {
    throw new CanonicalChangeValidationError("Canonical change target is not allowlisted.");
  }
  if (!/^[0-9a-f]{40}$/.test(request.baseRevision)) {
    throw new CanonicalChangeValidationError("Base revision must be a full Git SHA.");
  }
  const summary = request.operation.summary.trim();
  if (!summary || summary.length > 4000) {
    throw new CanonicalChangeValidationError("Story node summary must be 1 to 4000 characters.");
  }
  if (!request.changeSummary.trim() || request.changeSummary.trim().length > 500) {
    throw new CanonicalChangeValidationError("Change summary must be 1 to 500 characters.");
  }

  const beforeIds = validateCanonicalStory(currentStory);
  const nextStory = cloneJsonObject(currentStory);
  const sagas = nextStory.sagas as unknown[];
  let match: JsonObject | null = null;
  for (const saga of sagas) {
    if (!isObject(saga) || !Array.isArray(saga.chapters)) continue;
    for (const chapter of saga.chapters) {
      if (!isObject(chapter) || !Array.isArray(chapter.nodes)) continue;
      for (const node of chapter.nodes) {
        if (isObject(node) && node.id === request.semanticId) {
          if (match) throw new CanonicalChangeValidationError(`Semantic ID ${request.semanticId} is ambiguous.`);
          match = node;
        }
      }
    }
  }
  if (!match) throw new CanonicalChangeValidationError(`Story node ${request.semanticId} was not found.`);

  const previousSummary = typeof match.summary === "string" ? match.summary : null;
  match.summary = summary;
  const afterIds = validateCanonicalStory(nextStory);
  if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) {
    throw new CanonicalChangeValidationError("Stable narrative IDs changed during the proposal.");
  }

  return {
    content: `${JSON.stringify(nextStory, null, 2)}\n`,
    previousSummary,
    nextSummary: summary,
    stableIds: afterIds,
  };
}

export function canonicalProposalBranchName(semanticId: string, changeRequestId: string): string {
  const safeSemanticId = semanticId.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const safeRequestId = changeRequestId.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!safeSemanticId || !safeRequestId) {
    throw new CanonicalChangeValidationError("Proposal branch identity is invalid.");
  }
  const branch = `studio/story/${safeSemanticId}/${safeRequestId}`;
  if (branch === "main" || branch.length > 240) {
    throw new CanonicalChangeValidationError("Proposal branch name is invalid.");
  }
  return branch;
}
