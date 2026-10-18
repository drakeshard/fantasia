import { describe, expect, it } from "vitest";
import {
  buildStudioDashboard,
  type StudioReadModelsResponse,
} from "../../apps/content-studio/src/dashboard-model";
import type { StudioEntityReadModel } from "../../packages/studio-read-model/src/index";

function model(overrides: Record<string, unknown> = {}): StudioEntityReadModel {
  return {
    readModelVersion: 1,
    semanticId: "story.s01.ch01.b01",
    entityType: "story",
    displayName: "Strangers on the Road",
    canonical: {
      semanticId: "story.s01.ch01.b01",
      entityType: "story",
      displayName: "Strangers on the Road",
      canonicalPath: "content/narrative/story.json",
      canonicalData: {},
      provenance: {
        authority: "git",
        source: "content/narrative/story.json",
        revision: "0123456789abcdef0123456789abcdef01234567",
        canonical: true,
      },
    },
    lifecycle: "IN REVIEW",
    schemaVersion: 1,
    validations: [],
    assets: [],
    relations: [],
    history: [],
    provenance: [],
    issues: [],
    permissions: {
      role: "Viewer",
      capabilities: ["studio.read"],
      canRead: true,
      canEditRegistryMetadata: false,
      canApprove: false,
      canFreeze: false,
      canManageMembership: false,
    },
    ...overrides,
  } as unknown as StudioEntityReadModel;
}

function response(
  models: readonly StudioEntityReadModel[],
  canonicalProposals: StudioReadModelsResponse["canonicalProposals"] = {
    state: "available",
    observedAt: "2026-10-18T04:00:00Z",
    items: [],
  },
): StudioReadModelsResponse {
  return {
    readModelVersion: 1,
    revision: "0123456789abcdef0123456789abcdef01234567",
    freshness: {
      gitRevision: "0123456789abcdef0123456789abcdef01234567",
      gitState: "deployment-snapshot",
      registryObservedAt: "2026-10-18T04:00:00Z",
      providerState: "registry-observed-no-live-provider-fetch",
    },
    search: { total: models.length, offset: 0, limit: 100 },
    models,
    canonicalProposals,
  };
}

describe("Content Studio production Dashboard", () => {
  it("keeps review, validation, and source-integrity attention as independent facts", () => {
    const projection = buildStudioDashboard(
      response([
        model({
          validations: [{ dimension: "content", outcome: "FAILED", blocking: true }],
          issues: [
            {
              code: "canonical-path-mismatch",
              severity: "blocking",
              message: "Registry canonical path does not match Git truth.",
            },
          ],
        }),
      ]),
    );

    expect(projection.sections.find((section) => section.id === "review")?.items).toHaveLength(1);
    expect(projection.sections.find((section) => section.id === "validation")?.items).toHaveLength(
      1,
    );
    expect(
      projection.sections.find((section) => section.id === "source-integrity")?.items,
    ).toHaveLength(1);
    expect(
      projection.sections.find((section) => section.id === "publish-verification")?.state,
    ).toBe("unavailable");
  });

  it("treats runtime-ready and unpublished as a separate operational queue", () => {
    const projection = buildStudioDashboard(
      response([
        model({
          lifecycle: "RUNTIME READY",
          validations: [],
          issues: [],
        }),
      ]),
    );

    const section = projection.sections.find((item) => item.id === "runtime-unpublished");
    expect(section?.state).toBe("available");
    expect(section?.items).toHaveLength(1);
    expect(section?.items[0]?.detail).toContain("not PUBLISHED");
  });

  it("represents an unavailable proposal source differently from an empty source", () => {
    const projection = buildStudioDashboard(
      response([], {
        state: "unavailable",
        observedAt: null,
        items: [],
        message: "Proposal summary RPC is not deployed.",
      }),
    );

    const proposalSection = projection.sections.find(
      (section) => section.id === "canonical-proposals",
    );
    expect(proposalSection?.state).toBe("unavailable");
    expect(proposalSection?.unavailableReason).toContain("not deployed");
    expect(projection.state).toBe("partial");
  });

  it("projects open canonical Git proposal state without granting merge or approval authority", () => {
    const projection = buildStudioDashboard(
      response([], {
        state: "available",
        observedAt: "2026-10-18T04:05:00Z",
        items: [
          {
            changeRequestId: "cr-001",
            semanticId: "story.s01.ch01.b01",
            status: "CHECKS_PENDING",
            branchName: "studio/story/cr-001",
            commitSha: "abcdef0123456789abcdef0123456789abcdef01",
            pullRequestNumber: 192,
            pullRequestUrl: "https://github.com/drakeshard/fantasia/pull/192",
            validationMessage: null,
            updatedAt: "2026-10-18T04:05:00Z",
          },
        ],
      }),
    );

    const proposal = projection.sections.find((section) => section.id === "canonical-proposals");
    expect(proposal?.items).toHaveLength(1);
    expect(proposal?.items[0]?.severity).toBe("warning");
    expect(proposal?.items[0]?.externalUrl).toContain("/pull/192");
  });
});
