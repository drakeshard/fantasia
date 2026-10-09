export type CampaignStageKind = "story" | "battle";
export type CampaignVisibility = "hidden" | "revealed";
export type CampaignCompletion = "not-cleared" | "cleared";

export type CampaignAccess =
  | Readonly<{ kind: "available" }>
  | Readonly<{ kind: "locked"; reason: string }>;

export type CampaignEntry =
  | Readonly<{ kind: "available"; destination: string }>
  | Readonly<{ kind: "unavailable"; reason: string }>;

export interface CampaignStageDefinition {
  readonly id: string;
  readonly sequence: number;
  readonly kind: CampaignStageKind;
  readonly visibility: CampaignVisibility;
  readonly title?: string;
  readonly synopsis?: string;
  readonly objective?: string;
  readonly condition?: string;
  readonly access: CampaignAccess;
  readonly completion: CampaignCompletion;
  readonly entry: CampaignEntry;
}

export interface CampaignChapterDefinition {
  readonly id: string;
  readonly sequence: number;
  readonly title: string;
  readonly visibility: CampaignVisibility;
  readonly stages: readonly CampaignStageDefinition[];
}

export interface CampaignSagaDefinition {
  readonly id: string;
  readonly sequence: number;
  readonly title: string;
  readonly synopsis: string;
  readonly chapters: readonly CampaignChapterDefinition[];
}

export interface CampaignState {
  readonly saga: CampaignSagaDefinition;
  readonly currentChapterId: string;
  readonly currentStageId: string;
}

const stageExecutionUnavailable =
  "Canonical story and battle execution is not implemented in the current production slice.";

const chapterOneStages: readonly CampaignStageDefinition[] = [
  {
    id: "s01-ch01-n01-other-side",
    sequence: 1,
    kind: "story",
    visibility: "revealed",
    title: "The Other Side",
    synopsis: "The injured traveler emerges into an unfamiliar countryside after the rupture.",
    access: { kind: "available" },
    completion: "not-cleared",
    entry: { kind: "unavailable", reason: stageExecutionUnavailable },
  },
  {
    id: "s01-ch01-b01-strangers-road",
    sequence: 2,
    kind: "battle",
    visibility: "revealed",
    title: "Strangers on the Road",
    synopsis: "Armed foragers threaten civilians and a supply cart on the road.",
    objective: "Escort civilians and the supply cart to safety.",
    condition:
      "The protagonist is injured and carries a broken sword. Normal attacks are unavailable.",
    access: { kind: "available" },
    completion: "not-cleared",
    entry: { kind: "unavailable", reason: stageExecutionUnavailable },
  },
  {
    id: "s01-ch01-n03-shelter",
    sequence: 3,
    kind: "story",
    visibility: "revealed",
    title: "Shelter Before Nightfall",
    access: { kind: "available" },
    completion: "not-cleared",
    entry: { kind: "unavailable", reason: stageExecutionUnavailable },
  },
  {
    id: "s01-ch01-n04-names",
    sequence: 4,
    kind: "story",
    visibility: "revealed",
    title: "Names That Should Mean Nothing",
    access: { kind: "available" },
    completion: "not-cleared",
    entry: { kind: "unavailable", reason: stageExecutionUnavailable },
  },
  {
    id: "s01-ch01-b02-road-orleans",
    sequence: 5,
    kind: "battle",
    visibility: "revealed",
    title: "The Road to Orléans",
    access: { kind: "available" },
    completion: "not-cleared",
    entry: { kind: "unavailable", reason: stageExecutionUnavailable },
  },
  {
    id: "s01-ch01-n06-maid-coming",
    sequence: 6,
    kind: "story",
    visibility: "revealed",
    title: "The Maid Is Coming",
    access: { kind: "available" },
    completion: "not-cleared",
    entry: { kind: "unavailable", reason: stageExecutionUnavailable },
  },
];

export const fantasiaCampaignFixture: CampaignState = {
  saga: {
    id: "s01-maid-of-france",
    sequence: 1,
    title: "The Maid of France",
    synopsis: "A stranger follows a road into a country at war.",
    chapters: [
      {
        id: "s01-ch01-stranger-france",
        sequence: 1,
        title: "A Stranger in France",
        visibility: "revealed",
        stages: chapterOneStages,
      },
      {
        id: "s01-ch02-siege-orleans",
        sequence: 2,
        title: "The Siege of Orléans",
        visibility: "revealed",
        stages: [],
      },
    ],
  },
  currentChapterId: "s01-ch01-stranger-france",
  currentStageId: "s01-ch01-n01-other-side",
};

export function visibleCampaignChapters(
  state: CampaignState,
): readonly CampaignChapterDefinition[] {
  return state.saga.chapters.filter((chapter) => chapter.visibility === "revealed");
}

export function visibleCampaignStages(
  chapter: CampaignChapterDefinition,
): readonly CampaignStageDefinition[] {
  return chapter.stages.filter((stage) => stage.visibility === "revealed");
}

export function campaignChapter(
  state: CampaignState,
  chapterId: string,
): CampaignChapterDefinition | undefined {
  return visibleCampaignChapters(state).find((chapter) => chapter.id === chapterId);
}

export function campaignStage(
  chapter: CampaignChapterDefinition,
  stageId: string,
): CampaignStageDefinition | undefined {
  return visibleCampaignStages(chapter).find((stage) => stage.id === stageId);
}
