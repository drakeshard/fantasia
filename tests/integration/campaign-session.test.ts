import { describe, expect, it } from "vitest";
import {
  type CampaignChapterDefinition,
  visibleCampaignStages,
} from "../../packages/game/src/index.ts";
import { CampaignSession } from "../../packages/runtime/src/index.ts";

describe("GAME-UI04 campaign presentation session", () => {
  it("exposes controlled saga, chapter, and stage facts deterministically", () => {
    const first = new CampaignSession().view();
    const second = new CampaignSession().view();

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.sagaTitle).toBe("The Maid of France");
    expect(first.selectedChapterTitle).toBe("A Stranger in France");
    expect(first.chapters.map((chapter) => chapter.title)).toEqual([
      "A Stranger in France",
      "The Siege of Orléans",
    ]);
    expect(first.stages.map((stage) => stage.title)).toEqual([
      "The Other Side",
      "Strangers on the Road",
      "Shelter Before Nightfall",
      "Names That Should Mean Nothing",
      "The Road to Orléans",
      "The Maid Is Coming",
    ]);
    expect(first.stages.every((stage) => stage.access.kind === "available")).toBe(true);
  });

  it("filters hidden stages before they can become presentation targets", () => {
    const chapter: CampaignChapterDefinition = {
      id: "test-chapter",
      sequence: 1,
      title: "Test chapter",
      visibility: "revealed",
      stages: [
        {
          id: "visible-stage",
          sequence: 1,
          kind: "story",
          visibility: "revealed",
          title: "Visible stage",
          access: { kind: "available" },
          completion: "not-cleared",
          entry: { kind: "unavailable", reason: "Test fixture" },
        },
        {
          id: "hidden-stage",
          sequence: 2,
          kind: "story",
          visibility: "hidden",
          title: "Secret title",
          access: { kind: "available" },
          completion: "not-cleared",
          entry: { kind: "unavailable", reason: "Test fixture" },
        },
      ],
    };

    const visible = visibleCampaignStages(chapter);
    expect(visible.map((stage) => stage.id)).toEqual(["visible-stage"]);
    expect(visible.some((stage) => stage.title === "Secret title")).toBe(false);
  });

  it("keeps selection transient and makes canonical entry explicit and truthful", () => {
    const campaign = new CampaignSession();
    const baseline = campaign.view();
    const selected = campaign.selectStage("s01-ch01-b01-strangers-road");

    expect(selected?.selectedStageId).toBe("s01-ch01-b01-strangers-road");
    expect(selected?.stages.find((stage) => stage.selected)?.title).toBe("Strangers on the Road");
    expect(baseline.selectedStageId).toBe("s01-ch01-n01-other-side");

    const entry = campaign.enterSelectedStage();
    expect(entry.kind).toBe("rejected");
    if (entry.kind !== "rejected") return;
    expect(entry.reason).toBe(
      "Canonical story and battle execution is not implemented in the current production slice.",
    );
    expect(entry.view.selectedStageId).toBe("s01-ch01-b01-strangers-road");
  });

  it("does not invent stages for a controlled chapter whose production content is not wired", () => {
    const campaign = new CampaignSession();
    const chapterTwo = campaign.selectChapter("s01-ch02-siege-orleans");

    expect(chapterTwo?.selectedChapterTitle).toBe("The Siege of Orléans");
    expect(chapterTwo?.stages).toEqual([]);
    expect(chapterTwo?.selectedStageId).toBeUndefined();

    const entry = campaign.enterSelectedStage();
    expect(entry.kind).toBe("rejected");
    if (entry.kind !== "rejected") return;
    expect(entry.reason).toBe("Select an available stage before entry.");

    const continued = campaign.continueCurrent();
    expect(continued.selectedChapterTitle).toBe("A Stranger in France");
    expect(continued.selectedStageId).toBe("s01-ch01-n01-other-side");
  });
});
