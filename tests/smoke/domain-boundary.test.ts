import { describe, expect, it } from "vitest";
import { gameDomainStatus } from "../../packages/game/src/index.js";

 describe("GAME-I00 domain boundary", () => {
  it("boots without renderer or browser authority", () => {
    expect(gameDomainStatus()).toContain("domain boundary ready");
  });
});
