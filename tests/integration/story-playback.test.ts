import { describe, expect, it } from "vitest";
import { approvedChapterOneStory } from "../../apps/web/src/story.tsx";

describe("GAME-EXEC01 approved story playback", () => {
  it("derives player-facing CH01 playback from the canonical approved script", () => {
    const playback = approvedChapterOneStory("CH01-N01");

    expect(playback?.nodeTitle).toBe("The Other Side");
    expect(playback?.events.length).toBeGreaterThan(0);
    expect(playback?.events[0]?.text).toBe(
      "A sharp shimmer folds in on itself behind MC and vanishes.",
    );
    expect(playback?.events.every((event) => !["control", "transition"].includes(event.type))).toBe(
      true,
    );
    expect(playback?.events.some((event) => event.displayLabel === "Young Woman")).toBe(true);
    expect(
      playback?.events.some((event) =>
        event.text.includes("Player regains movement control"),
      ),
    ).toBe(false);
  });

  it("does not expose battle nodes or non-CH01 nodes through the story player", () => {
    expect(approvedChapterOneStory("CH01-B01")).toBeUndefined();
    expect(approvedChapterOneStory("PRO-N01")).toBeUndefined();
    expect(approvedChapterOneStory("missing-node")).toBeUndefined();
  });
});
