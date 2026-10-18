import { describe, expect, it } from "vitest";
import {
  currentCampaignProgressSnapshot,
  restoreCampaignProgress,
} from "../../packages/game/src/index.ts";
import { CampaignSession } from "../../packages/runtime/src/index.ts";

describe("GAME-BACKEND02 campaign persistence contract", () => {
  it("round-trips the current Git-owned campaign cursor deterministically", () => {
    const snapshot = currentCampaignProgressSnapshot();
    const restored = restoreCampaignProgress(snapshot);

    expect(restored).toEqual({ kind: "restored", snapshot });

    const first = new CampaignSession({ progress: snapshot });
    const second = new CampaignSession({ progress: snapshot });
    expect(second.progressSnapshot()).toEqual(first.progressSnapshot());
    expect(second.view()).toEqual(first.view());
  });

  it("rejects stale saga, chapter, and stage identifiers", () => {
    const snapshot = currentCampaignProgressSnapshot();

    expect(restoreCampaignProgress({ ...snapshot, sagaId: "missing-saga" })).toEqual({
      kind: "rejected",
      reason: "Campaign progress references an unknown saga.",
    });
    expect(restoreCampaignProgress({ ...snapshot, chapterId: "missing-chapter" })).toEqual({
      kind: "rejected",
      reason: "Campaign progress references an unavailable chapter.",
    });
    expect(restoreCampaignProgress({ ...snapshot, stageId: "missing-stage" })).toEqual({
      kind: "rejected",
      reason: "Campaign progress references an unavailable stage.",
    });
  });

  it("keeps temporary map browsing separate from persisted progress", () => {
    const snapshot = currentCampaignProgressSnapshot();
    const campaign = new CampaignSession({ progress: snapshot });

    const browsed = campaign.selectChapter("s01-ch02-siege-orleans");
    expect(browsed?.selectedChapterId).toBe("s01-ch02-siege-orleans");
    expect(campaign.progressSnapshot()).toEqual(snapshot);

    const continued = campaign.continueCurrent();
    expect(continued.selectedChapterId).toBe(snapshot.chapterId);
    expect(continued.selectedStageId).toBe(snapshot.stageId);
  });

  it("rejects invalid persisted progress before constructing a runtime session", () => {
    const snapshot = currentCampaignProgressSnapshot();

    expect(
      () => new CampaignSession({ progress: { ...snapshot, stageId: "retired-stage" } }),
    ).toThrow("Campaign progress references an unavailable stage.");
  });
});
