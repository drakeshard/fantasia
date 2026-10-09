import {
  campaignChapter,
  campaignStage,
  type CampaignAccess,
  type CampaignChapterDefinition,
  type CampaignCompletion,
  type CampaignEntry,
  type CampaignStageKind,
  fantasiaCampaignFixture,
  visibleCampaignChapters,
  visibleCampaignStages,
} from "@fantasia/game";

export interface CampaignChapterView {
  readonly id: string;
  readonly sequence: number;
  readonly title: string;
  readonly current: boolean;
  readonly selected: boolean;
  readonly stageCount: number;
}

export interface CampaignStageView {
  readonly id: string;
  readonly sequence: number;
  readonly kind: CampaignStageKind;
  readonly title: string;
  readonly synopsis?: string;
  readonly objective?: string;
  readonly condition?: string;
  readonly access: CampaignAccess;
  readonly completion: CampaignCompletion;
  readonly entry: CampaignEntry;
  readonly current: boolean;
  readonly selected: boolean;
}

export interface CampaignView {
  readonly sagaId: string;
  readonly sagaSequence: number;
  readonly sagaTitle: string;
  readonly sagaSynopsis: string;
  readonly chapters: readonly CampaignChapterView[];
  readonly selectedChapterId: string;
  readonly selectedChapterSequence: number;
  readonly selectedChapterTitle: string;
  readonly stages: readonly CampaignStageView[];
  readonly selectedStageId?: string;
}

export type CampaignEntryResult =
  | Readonly<{ kind: "accepted"; destination: string; view: CampaignView }>
  | Readonly<{ kind: "rejected"; reason: string; view: CampaignView }>;

function chapterView(
  chapter: CampaignChapterDefinition,
  selectedChapterId: string,
): CampaignChapterView {
  return {
    id: chapter.id,
    sequence: chapter.sequence,
    title: chapter.title,
    current: chapter.id === fantasiaCampaignFixture.currentChapterId,
    selected: chapter.id === selectedChapterId,
    stageCount: visibleCampaignStages(chapter).length,
  };
}

export class CampaignSession {
  #selectedChapterId = fantasiaCampaignFixture.currentChapterId;
  #selectedStageId: string | undefined = fantasiaCampaignFixture.currentStageId;

  view(): CampaignView {
    const chapters = visibleCampaignChapters(fantasiaCampaignFixture);
    const selectedChapter = campaignChapter(fantasiaCampaignFixture, this.#selectedChapterId);
    if (selectedChapter === undefined) {
      throw new Error("Campaign session references an unavailable chapter");
    }

    const stages = visibleCampaignStages(selectedChapter);
    const selectedStage =
      this.#selectedStageId === undefined
        ? undefined
        : campaignStage(selectedChapter, this.#selectedStageId);

    return {
      sagaId: fantasiaCampaignFixture.saga.id,
      sagaSequence: fantasiaCampaignFixture.saga.sequence,
      sagaTitle: fantasiaCampaignFixture.saga.title,
      sagaSynopsis: fantasiaCampaignFixture.saga.synopsis,
      chapters: chapters.map((chapter) => chapterView(chapter, selectedChapter.id)),
      selectedChapterId: selectedChapter.id,
      selectedChapterSequence: selectedChapter.sequence,
      selectedChapterTitle: selectedChapter.title,
      stages: stages.map((stage) => ({
        id: stage.id,
        sequence: stage.sequence,
        kind: stage.kind,
        title: stage.title ?? "Undiscovered",
        ...(stage.synopsis === undefined ? {} : { synopsis: stage.synopsis }),
        ...(stage.objective === undefined ? {} : { objective: stage.objective }),
        ...(stage.condition === undefined ? {} : { condition: stage.condition }),
        access: stage.access,
        completion: stage.completion,
        entry: stage.entry,
        current:
          selectedChapter.id === fantasiaCampaignFixture.currentChapterId &&
          stage.id === fantasiaCampaignFixture.currentStageId,
        selected: selectedStage?.id === stage.id,
      })),
      ...(selectedStage === undefined ? {} : { selectedStageId: selectedStage.id }),
    };
  }

  selectChapter(chapterId: string): CampaignView | undefined {
    const chapter = campaignChapter(fantasiaCampaignFixture, chapterId);
    if (chapter === undefined) return undefined;
    this.#selectedChapterId = chapter.id;
    const firstVisibleStage = visibleCampaignStages(chapter)[0];
    this.#selectedStageId = firstVisibleStage?.id;
    return this.view();
  }

  selectStage(stageId: string): CampaignView | undefined {
    const chapter = campaignChapter(fantasiaCampaignFixture, this.#selectedChapterId);
    if (chapter === undefined) return undefined;
    const stage = campaignStage(chapter, stageId);
    if (stage === undefined) return undefined;
    this.#selectedStageId = stage.id;
    return this.view();
  }

  continueCurrent(): CampaignView {
    this.#selectedChapterId = fantasiaCampaignFixture.currentChapterId;
    this.#selectedStageId = fantasiaCampaignFixture.currentStageId;
    return this.view();
  }

  enterSelectedStage(): CampaignEntryResult {
    const chapter = campaignChapter(fantasiaCampaignFixture, this.#selectedChapterId);
    const stage =
      chapter === undefined || this.#selectedStageId === undefined
        ? undefined
        : campaignStage(chapter, this.#selectedStageId);
    if (stage === undefined) {
      return { kind: "rejected", reason: "Select an available stage before entry.", view: this.view() };
    }
    if (stage.access.kind === "locked") {
      return { kind: "rejected", reason: stage.access.reason, view: this.view() };
    }
    if (stage.entry.kind === "unavailable") {
      return { kind: "rejected", reason: stage.entry.reason, view: this.view() };
    }
    return { kind: "accepted", destination: stage.entry.destination, view: this.view() };
  }
}
