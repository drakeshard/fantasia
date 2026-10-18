export const CANONICAL_STORY_PATH = "content/narrative/story.json" as const;
export const CANONICAL_STORY_NODE_CONTENT_TYPE = "fantasia.story.node.v1" as const;
export const CANONICAL_STORY_NODE_OPERATION = "set-node-summary" as const;
export const CANONICAL_CHARACTER_PATH = "content/characters/characters.json" as const;
export const CANONICAL_CHARACTER_CONTENT_TYPE = "fantasia.character.v1" as const;
export const CANONICAL_CHARACTER_OPERATION = "set-display-name" as const;

export type StoryNodeSummaryChange = {
  readonly kind: typeof CANONICAL_STORY_NODE_OPERATION;
  readonly summary: string;
};

export type CharacterDisplayNameChange = {
  readonly kind: typeof CANONICAL_CHARACTER_OPERATION;
  readonly displayName: string;
};

export type CanonicalStoryNodeChangeRequest = {
  readonly semanticId: string;
  readonly canonicalPath: typeof CANONICAL_STORY_PATH;
  readonly contentType: typeof CANONICAL_STORY_NODE_CONTENT_TYPE;
  readonly baseRevision: string;
  readonly operation: StoryNodeSummaryChange;
  readonly changeSummary: string;
};

export type CanonicalCharacterChangeRequest = {
  readonly semanticId: string;
  readonly canonicalPath: typeof CANONICAL_CHARACTER_PATH;
  readonly contentType: typeof CANONICAL_CHARACTER_CONTENT_TYPE;
  readonly baseRevision: string;
  readonly operation: CharacterDisplayNameChange;
  readonly changeSummary: string;
};

export type CanonicalChangeRequest =
  | CanonicalStoryNodeChangeRequest
  | CanonicalCharacterChangeRequest;

export type CanonicalChangeValidationResult = {
  readonly content: string;
  readonly previousValue: string | null;
  readonly nextValue: string;
  readonly stableIds: readonly string[];
  readonly validationMessage: string;
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
      assert(nonEmptyText(chapterValue.id), "Every chapter needs an id.");
      assert(Array.isArray(chapterValue.nodes), `${chapterValue.id}.nodes must be an array.`);
      const chapterNodeIds = new Set(
        chapterValue.nodes.filter(isObject).map((node) => node.id).filter((id): id is string => typeof id === "string"),
      );
      if (chapterValue.routeClusters !== undefined) {
        assert(Array.isArray(chapterValue.routeClusters), `${chapterValue.id}.routeClusters must be an array.`);
        for (const clusterValue of chapterValue.routeClusters) {
          assert(isObject(clusterValue), `${chapterValue.id} route cluster must be an object.`);
          assert(nonEmptyText(clusterValue.id), `${chapterValue.id} route cluster needs an id.`);
          assert(clusterValue.mode === "complete-any", `${clusterValue.id}.mode must be complete-any.`);
          assert(Array.isArray(clusterValue.nodeIds) && clusterValue.nodeIds.length > 0, `${clusterValue.id}.nodeIds must be non-empty.`);
          assert(Number.isInteger(clusterValue.requiredCount) && (clusterValue.requiredCount as number) > 0 && (clusterValue.requiredCount as number) <= clusterValue.nodeIds.length, `${clusterValue.id}.requiredCount is invalid.`);
          assert(nonEmptyText(clusterValue.reconvergesAt), `${clusterValue.id}.reconvergesAt is required.`);
          for (const routeNodeId of clusterValue.nodeIds) {
            assert(typeof routeNodeId === "string" && chapterNodeIds.has(routeNodeId), `${clusterValue.id} references unknown node: ${String(routeNodeId)}.`);
          }
          assert(chapterNodeIds.has(clusterValue.reconvergesAt), `${clusterValue.id} reconverges at unknown node: ${clusterValue.reconvergesAt}.`);
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
          assert(["draft", "proposed", "approved", "production-ready"].includes(String(nodeValue.scriptStatus)), `${nodeValue.id}.scriptStatus is invalid.`);
        }
        let previousOrder = 0;
        for (const beatValue of nodeValue.beats) {
          assert(isObject(beatValue), `${nodeValue.id} beat must be an object.`);
          assert(nonEmptyText(beatValue.id), `${nodeValue.id} beat needs an id.`);
          assert(!narrativeIds.has(beatValue.id), `Duplicate narrative id: ${beatValue.id}.`);
          narrativeIds.add(beatValue.id);
          stableIds.push(beatValue.id);
          assert(Number.isInteger(beatValue.order) && (beatValue.order as number) > previousOrder, `${beatValue.id}.order must increase.`);
          previousOrder = beatValue.order as number;
          for (const field of ["title", "presentation", "screenAction", "dialogueIntent", "playerControl", "trigger", "result"]) {
            assert(nonEmptyText(beatValue[field]), `${beatValue.id}.${field} is required.`);
          }
          if (beatValue.script !== undefined) {
            assert(Array.isArray(beatValue.script) && beatValue.script.length > 0, `${beatValue.id}.script must be non-empty.`);
            assert(["draft", "proposed", "approved", "production-ready"].includes(String(beatValue.scriptStatus)), `${beatValue.id}.scriptStatus is required when script exists.`);
            for (const [eventIndex, event] of beatValue.script.entries()) validateScriptEvent(event, `${beatValue.id}.script[${eventIndex}]`, scriptIds);
          }
        }
      }
    }
  }
  return stableIds;
}

export function validateCanonicalCharacters(value: unknown): readonly string[] {
  assert(isObject(value), "Character root must be an object.");
  assert(value.schemaVersion === 1, "characters.schemaVersion must be 1.");
  assert(Array.isArray(value.characters) && value.characters.length > 0, "characters.characters must be non-empty.");
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const [index, raw] of value.characters.entries()) {
    assert(isObject(raw), `characters[${index}] must be an object.`);
    assert(nonEmptyText(raw.semanticId) && raw.semanticId.startsWith("character."), `characters[${index}].semanticId is invalid.`);
    assert(!seen.has(raw.semanticId), `Duplicate character semantic ID: ${raw.semanticId}.`);
    seen.add(raw.semanticId);
    ids.push(raw.semanticId);
    assert(nonEmptyText(raw.actorId), `${raw.semanticId}.actorId is required.`);
    assert(nonEmptyText(raw.tacticalEntityId), `${raw.semanticId}.tacticalEntityId is required.`);
    assert(nonEmptyText(raw.displayName), `${raw.semanticId}.displayName is required.`);
    assert(raw.side === "player" || raw.side === "enemy", `${raw.semanticId}.side is invalid.`);
    assert(nonEmptyText(raw.shortLabel), `${raw.semanticId}.shortLabel is required.`);
    assert(Number.isInteger(raw.movementAllowance) && (raw.movementAllowance as number) > 0, `${raw.semanticId}.movementAllowance is invalid.`);
    assert(isObject(raw.initialCoord) && Number.isInteger(raw.initialCoord.x) && Number.isInteger(raw.initialCoord.y), `${raw.semanticId}.initialCoord is invalid.`);
    assert(isObject(raw.rpg), `${raw.semanticId}.rpg is required.`);
    assert(Array.isArray(raw.rpg.classes) && raw.rpg.classes.length > 0 && raw.rpg.classes.every(nonEmptyText), `${raw.semanticId}.rpg.classes is invalid.`);
    assert(nonEmptyText(raw.rpg.initialClass) && raw.rpg.classes.includes(raw.rpg.initialClass), `${raw.semanticId}.rpg.initialClass is invalid.`);
    assert(isObject(raw.rpg.attributes), `${raw.semanticId}.rpg.attributes is required.`);
    for (const key of ["physicalPower", "magicalPower", "defense", "resistance", "speed", "stability"]) {
      assert(typeof raw.rpg.attributes[key] === "number" && Number.isFinite(raw.rpg.attributes[key]), `${raw.semanticId}.rpg.attributes.${key} is invalid.`);
    }
    assert(isObject(raw.rpg.hp) && typeof raw.rpg.hp.current === "number" && typeof raw.rpg.hp.capacity === "number" && raw.rpg.hp.current >= 0 && raw.rpg.hp.capacity > 0 && raw.rpg.hp.current <= raw.rpg.hp.capacity, `${raw.semanticId}.rpg.hp is invalid.`);
  }
  return ids;
}

function cloneJsonObject(value: unknown): JsonObject {
  return JSON.parse(JSON.stringify(value)) as JsonObject;
}

export function applyStoryNodeSummaryChange(currentStory: unknown, request: CanonicalStoryNodeChangeRequest): CanonicalChangeValidationResult {
  const beforeIds = validateCanonicalStory(currentStory);
  const nextStory = cloneJsonObject(currentStory);
  let match: JsonObject | null = null;
  for (const saga of nextStory.sagas as unknown[]) {
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
  const summary = request.operation.summary.trim();
  if (!summary || summary.length > 4000) throw new CanonicalChangeValidationError("Story node summary must be 1 to 4000 characters.");
  const previousValue = typeof match.summary === "string" ? match.summary : null;
  match.summary = summary;
  const afterIds = validateCanonicalStory(nextStory);
  if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) throw new CanonicalChangeValidationError("Stable narrative IDs changed during the proposal.");
  return { content: `${JSON.stringify(nextStory, null, 2)}\n`, previousValue, nextValue: summary, stableIds: afterIds, validationMessage: `Validated ${afterIds.length} stable narrative IDs; changed summary only.` };
}

export function applyCharacterDisplayNameChange(currentCharacters: unknown, request: CanonicalCharacterChangeRequest): CanonicalChangeValidationResult {
  const beforeIds = validateCanonicalCharacters(currentCharacters);
  const nextCharacters = cloneJsonObject(currentCharacters);
  const rows = nextCharacters.characters as unknown[];
  const matches = rows.filter((row) => isObject(row) && row.semanticId === request.semanticId) as JsonObject[];
  if (matches.length !== 1) throw new CanonicalChangeValidationError(`Character ${request.semanticId} was not found uniquely.`);
  const displayName = request.operation.displayName.trim();
  if (!displayName || displayName.length > 120) throw new CanonicalChangeValidationError("Character display name must be 1 to 120 characters.");
  const previousValue = typeof matches[0]?.displayName === "string" ? matches[0].displayName : null;
  matches[0]!.displayName = displayName;
  const afterIds = validateCanonicalCharacters(nextCharacters);
  if (JSON.stringify(beforeIds) !== JSON.stringify(afterIds)) throw new CanonicalChangeValidationError("Stable character semantic IDs changed during the proposal.");
  return { content: `${JSON.stringify(nextCharacters, null, 2)}\n`, previousValue, nextValue: displayName, stableIds: afterIds, validationMessage: `Validated ${afterIds.length} stable character semantic IDs; changed displayName only.` };
}

export function applyCanonicalChange(current: unknown, request: CanonicalChangeRequest): CanonicalChangeValidationResult {
  if (!/^[0-9a-f]{40}$/.test(request.baseRevision)) throw new CanonicalChangeValidationError("Base revision must be a full Git SHA.");
  if (!request.changeSummary.trim() || request.changeSummary.trim().length > 500) throw new CanonicalChangeValidationError("Change summary must be 1 to 500 characters.");
  if (request.contentType === CANONICAL_STORY_NODE_CONTENT_TYPE && request.canonicalPath === CANONICAL_STORY_PATH && request.operation.kind === CANONICAL_STORY_NODE_OPERATION) return applyStoryNodeSummaryChange(current, request);
  if (request.contentType === CANONICAL_CHARACTER_CONTENT_TYPE && request.canonicalPath === CANONICAL_CHARACTER_PATH && request.operation.kind === CANONICAL_CHARACTER_OPERATION) return applyCharacterDisplayNameChange(current, request);
  throw new CanonicalChangeValidationError("Canonical change target is not allowlisted.");
}

export function canonicalProposalBranchName(request: CanonicalChangeRequest, changeRequestId: string): string {
  const safeSemanticId = request.semanticId.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  const safeRequestId = changeRequestId.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!safeSemanticId || !safeRequestId) throw new CanonicalChangeValidationError("Proposal branch identity is invalid.");
  const namespace = request.contentType === CANONICAL_CHARACTER_CONTENT_TYPE ? "character" : "story";
  const branch = `studio/${namespace}/${safeSemanticId}/${safeRequestId}`;
  if (branch === "main" || branch.length > 240) throw new CanonicalChangeValidationError("Proposal branch name is invalid.");
  return branch;
}
