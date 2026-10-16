import {
  campaignChapter,
  campaignStage,
  fantasiaCampaignFixture,
} from "./state.js";

export const FANTASIA_CAMPAIGN_PROGRESS_SCHEMA_VERSION = 1 as const;

export interface CampaignProgressSnapshot {
  readonly schemaVersion: typeof FANTASIA_CAMPAIGN_PROGRESS_SCHEMA_VERSION;
  readonly sagaId: string;
  readonly chapterId: string;
  readonly stageId: string;
}

export type CampaignProgressRestoreResult =
  | Readonly<{ kind: "restored"; snapshot: CampaignProgressSnapshot }>
  | Readonly<{ kind: "rejected"; reason: string }>;

export function currentCampaignProgressSnapshot(): CampaignProgressSnapshot {
  return {
    schemaVersion: FANTASIA_CAMPAIGN_PROGRESS_SCHEMA_VERSION,
    sagaId: fantasiaCampaignFixture.saga.id,
    chapterId: fantasiaCampaignFixture.currentChapterId,
    stageId: fantasiaCampaignFixture.currentStageId,
  };
}

export function restoreCampaignProgress(
  snapshot: CampaignProgressSnapshot,
): CampaignProgressRestoreResult {
  if (snapshot.schemaVersion !== FANTASIA_CAMPAIGN_PROGRESS_SCHEMA_VERSION) {
    return { kind: "rejected", reason: "Unsupported campaign progress schema version." };
  }
  if (snapshot.sagaId !== fantasiaCampaignFixture.saga.id) {
    return { kind: "rejected", reason: "Campaign progress references an unknown saga." };
  }

  const chapter = campaignChapter(fantasiaCampaignFixture, snapshot.chapterId);
  if (chapter === undefined) {
    return { kind: "rejected", reason: "Campaign progress references an unavailable chapter." };
  }

  const stage = campaignStage(chapter, snapshot.stageId);
  if (stage === undefined) {
    return { kind: "rejected", reason: "Campaign progress references an unavailable stage." };
  }

  return {
    kind: "restored",
    snapshot: {
      schemaVersion: FANTASIA_CAMPAIGN_PROGRESS_SCHEMA_VERSION,
      sagaId: fantasiaCampaignFixture.saga.id,
      chapterId: chapter.id,
      stageId: stage.id,
    },
  };
}
