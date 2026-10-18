import { describe, expect, it } from "vitest";
import {
  type CampaignChapterDefinition,
  visibleCampaignStages,
} from "../../packages/game/src/index.ts";
import { CampaignSession } from "../../packages/runtime/src/index.ts";

describe("GAME-EXEC01 campaign presentation session", () => {
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

  it("accepts approved story entry while keeping battle execution explicitly unavailable", () => {
    const campaign = new CampaignSession();
    const baseline = campaign.view();

    const storyEntry = campaign.enterSelectedStage();
    expect(storyEntry.kind).toBe("accepted");
    if (storyEntry.kind === "accepted") {
      expect(storyEntry.destination).toBe("CH01-N01");
      expect(storyEntry.view.selectedStageId).toBe("s01-ch01-n01-other-side");
    }
    expect(baseline.selectedStageId).toBe("s01-ch01-n01-other-side");

    const selectedBattle = campaign.selectStage("s01-ch01-b01-strangers-road");
    expect(selectedBattle?.selectedStageId).toBe("s01-ch01-b01-strangers-road");
    expect(selectedBattle?.stages.find((stage) => stage.selected)?.title).toBe(
      "Strangers on the Road",
    );

    const battleEntry = campaign.enterSelectedStage();
    expect(battleEntry.kind).toBe("rejected");
    if (battleEntry.kind !== "rejected") return;
    expect(battleEntry.reason).toBe(
      "Canonical battle execution is unavailable until the reviewed CH01 encounter geometry and content are implemented.",
    );
    expect(battleEntry.view.selectedStageId).toBe("s01-ch01-b01-strangers-road");
  });

  it("exposes canonical story destinations only for the approved CH01 story stages", () => {
    const campaign = new CampaignSession();
    const expected = new Map([
      ["s01-ch01-n01-other-side", "CH01-N01"],
      ["s01-ch01-n03-shelter", "CH01-N03"],
      ["s01-ch01-n04-names", "CH01-N04"],
      ["s01-ch01-n06-maid-coming", "CH01-N06"],
    ]);

    for (const [stageId, destination] of expected) {
      campaign.selectStage(stageId);
      const entry = campaign.enterSelectedStage();
      expect(entry.kind).toBe("accepted");
      if (entry.kind === "accepted") expect(entry.destination).toBe(destination);
    }

    for (const stageId of ["s01-ch01-b01-strangers-road", "s01-ch01-b02-road-orleans"]) {
      campaign.selectStage(stageId);
      expect(campaign.enterSelectedStage().kind).toBe("rejected");
    }
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
