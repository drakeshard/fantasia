import { describe, expect, it } from "vitest";
import { defineProductionPageContract, productionPageContractFields } from "./page-contract";

describe("Content Studio production page contract", () => {
  it("keeps every required implementation field explicit", () => {
    expect(productionPageContractFields).toEqual([
      "purpose",
      "authorities",
      "rolesAndActions",
      "template",
      "sections",
      "states",
      "validationAndHistory",
      "responsiveAndAccessibility",
    ]);
  });

  it("retains the selected shared template and common presentation states", () => {
    const contract = defineProductionPageContract({
      purpose: "Fixture contract",
      authorities: ["Git canonical definitions"],
      rolesAndActions: ["Viewer: read"],
      template: "entity",
      sections: ["Overview", "Validation", "History"],
      states: ["loading", "empty", "error", "read-only", "unauthorized"],
      validationAndHistory: "Use 00C semantics and retained version history.",
      responsiveAndAccessibility: "Keyboard, focus restoration and compact overflow required.",
    });

    expect(contract.template).toBe("entity");
    expect(contract.states).toContain("unauthorized");
  });
});
