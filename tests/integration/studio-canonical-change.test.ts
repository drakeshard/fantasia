import { describe, expect, it } from "vitest";
import {
  applyStoryNodeSummaryChange,
  canonicalProposalBranchName,
  CANONICAL_STORY_NODE_CONTENT_TYPE,
  CANONICAL_STORY_NODE_OPERATION,
  CANONICAL_STORY_PATH,
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

describe("Studio canonical Git change proposal", () => {
  it("keeps the first writable surface intentionally narrow", () => {
    const parsed = parseCanonicalChangeRequest({
      type: STUDIO_CANONICAL_CHANGE_PROPOSE,
      idempotencyKey: "studio04-proof-001",
      payload: request,
    });
    expect(parsed.payload.canonicalPath).toBe("content/narrative/story.json");
    expect(parsed.payload.contentType).toBe("fantasia.story.node.v1");
    expect(parsed.payload.operation.kind).toBe("set-node-summary");
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
    expect(result.previousSummary).toBe("Old summary");
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

  it("creates deterministic proposal branches outside main", () => {
    const branch = canonicalProposalBranchName("CH01-N01", "studio04-proof-003");
    expect(branch).toBe("studio/story/ch01-n01/studio04-proof-003");
    expect(branch).not.toBe("main");
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
