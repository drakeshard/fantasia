import { describe, expect, it } from "vitest";
import {
  applyStoryNodeSummaryChange,
  CANONICAL_CHARACTER_CONTENT_TYPE,
  CANONICAL_CHARACTER_OPERATION,
  CANONICAL_CHARACTER_PATH,
  CANONICAL_STORY_NODE_CONTENT_TYPE,
  CANONICAL_STORY_NODE_OPERATION,
  CANONICAL_STORY_PATH,
  canonicalProposalBranchName,
  validateCanonicalStory,
} from "../../supabase/functions/studio-operations/canonical-change";
import {
  parseCanonicalChangeRequest,
  STUDIO_CANONICAL_CHANGE_PROPOSE,
  STUDIO_PROPOSAL_STATES,
} from "../../supabase/functions/studio-operations/canonical-change-contract";

function storyFixture() {
  return {
    schemaVersion: 1,
    project: { id: "fantasia" },
    sagas: [
      {
        id: "saga-1",
        chapters: [
          {
            id: "ch01",
            nodes: [
              {
                id: "CH01-N01",
                summary: "Old summary",
                beats: [
                  {
                    id: "CH01-N01-B01",
                    order: 1,
                    title: "Opening",
                    presentation: "Field",
                    screenAction: "Camera settles.",
                    dialogueIntent: "Set the stakes.",
                    playerControl: "None",
                    trigger: "Node start",
                    result: "Scene established",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

const request = {
  semanticId: "CH01-N01",
  canonicalPath: CANONICAL_STORY_PATH,
  contentType: CANONICAL_STORY_NODE_CONTENT_TYPE,
  baseRevision: "a".repeat(40),
  operation: { kind: CANONICAL_STORY_NODE_OPERATION, summary: "Updated summary" },
  changeSummary: "Clarify the opening node summary",
} as const;

const characterRequest = {
  semanticId: "character.production.hero",
  canonicalPath: CANONICAL_CHARACTER_PATH,
  contentType: CANONICAL_CHARACTER_CONTENT_TYPE,
  baseRevision: "a".repeat(40),
  operation: { kind: CANONICAL_CHARACTER_OPERATION, displayName: "Main Character" },
  changeSummary: "Clarify the production hero display name",
} as const;

describe("Studio canonical Git change proposal", () => {
  it("keeps each writable surface intentionally narrow", () => {
    const parsedStory = parseCanonicalChangeRequest({
      type: STUDIO_CANONICAL_CHANGE_PROPOSE,
      idempotencyKey: "studio04-proof-001",
      payload: request,
    });
    expect(parsedStory.payload.canonicalPath).toBe("content/narrative/story.json");
    expect(parsedStory.payload.contentType).toBe("fantasia.story.node.v1");
    expect(parsedStory.payload.operation.kind).toBe("set-node-summary");

    const parsedCharacter = parseCanonicalChangeRequest({
      type: STUDIO_CANONICAL_CHANGE_PROPOSE,
      idempotencyKey: "studio06-proof-001",
      payload: characterRequest,
    });
    expect(parsedCharacter.payload.canonicalPath).toBe("content/characters/characters.json");
    expect(parsedCharacter.payload.contentType).toBe("fantasia.character.v1");
    expect(parsedCharacter.payload.operation.kind).toBe("set-display-name");
  });

  it("rejects arbitrary repository paths", () => {
    expect(() =>
      parseCanonicalChangeRequest({
        type: STUDIO_CANONICAL_CHANGE_PROPOSE,
        idempotencyKey: "studio04-proof-002",
        payload: { ...request, canonicalPath: "package.json" },
      }),
    ).toThrow("not allowlisted");
  });

  it("updates only the requested summary while preserving stable narrative IDs", () => {
    const before = storyFixture();
    const beforeIds = validateCanonicalStory(before);
    const result = applyStoryNodeSummaryChange(before, request);
    const after = JSON.parse(result.content) as ReturnType<typeof storyFixture>;
    expect(result.previousValue).toBe("Old summary");
    expect(result.nextValue).toBe("Updated summary");
    expect(after.sagas[0].chapters[0].nodes[0].summary).toBe("Updated summary");
    expect(result.stableIds).toEqual(beforeIds);
    expect(before.sagas[0].chapters[0].nodes[0].summary).toBe("Old summary");
  });

  it("rejects malformed canonical story content before repository mutation", () => {
    const malformed = storyFixture();
    malformed.project.id = "not-fantasia";
    expect(() => applyStoryNodeSummaryChange(malformed, request)).toThrow(
      "story.project.id must be fantasia",
    );
  });

  it("rejects missing semantic targets", () => {
    expect(() =>
      applyStoryNodeSummaryChange(storyFixture(), { ...request, semanticId: "CH99-N99" }),
    ).toThrow("was not found");
  });

  it("creates deterministic proposal branches outside main for each allowlisted content type", () => {
    const storyBranch = canonicalProposalBranchName(request, "studio04-proof-003");
    expect(storyBranch).toBe("studio/story/ch01-n01/studio04-proof-003");
    expect(storyBranch).not.toBe("main");

    const characterBranch = canonicalProposalBranchName(characterRequest, "studio06-proof-003");
    expect(characterBranch).toBe(
      "studio/character/character.production.hero/studio06-proof-003",
    );
    expect(characterBranch).not.toBe("main");
  });

  it("exports reusable authoring/proposal states without redefining content lifecycle", () => {
    expect(STUDIO_PROPOSAL_STATES).toEqual([
      "clean",
      "edited",
      "validating",
      "validation-failed",
      "stale",
      "proposal-creating",
      "pr-open",
      "checks-pending",
      "checks-failed",
      "merged",
      "closed",
      "superseded",
      "failed",
    ]);
    expect(STUDIO_PROPOSAL_STATES).not.toContain("approved");
    expect(STUDIO_PROPOSAL_STATES).not.toContain("frozen");
  });
});
