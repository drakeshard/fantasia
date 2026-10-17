import { describe, expect, it } from "vitest";
import { TalentMenuSession } from "../../packages/runtime/src/index.js";

describe("TalentMenuSession", () => {
  it("projects only authoritative Talent prerequisites into the player read model", () => {
    const view = new TalentMenuSession().view();
    const lancer = view.classTrees[0];
    expect(lancer).toBeDefined();

    const nodes = lancer?.doctrines.flatMap((doctrine) => doctrine.nodes) ?? [];
    const brace = nodes.find((node) => node.nodeId === "LAN-CC-BRACE-01");
    expect(brace?.prerequisiteGroups).toEqual([
      {
        mode: "all",
        requirements: [{ kind: "node-rank", nodeId: "LAN-CC-PWR-01", rank: 1 }],
      },
    ]);

    expect(
      nodes
        .filter((node) => node.nodeId !== "LAN-CC-BRACE-01")
        .every((node) => node.prerequisiteGroups.length === 0),
    ).toBe(true);
  });
});
