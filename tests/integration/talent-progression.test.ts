import { describe, expect, it } from "vitest";
import {
  type AccountTalentState,
  advanceTalentRank,
  createAccountTalentState,
  deserializeAccountTalentState,
  LANCER_CLASS_TALENT_SCAFFOLD,
  projectClassTalentProfile,
  serializeAccountTalentState,
  type TalentTreeDefinition,
  talentNodeRank,
  unlockedTalentRewardKeys,
  validateTalentTreeDefinition,
} from "../../packages/game/src/index.ts";

const approvedLancerTree: TalentTreeDefinition = {
  schemaVersion: 1,
  treeId: "class:lancer:test",
  family: "class",
  scopeKey: "Lancer",
  doctrines: ["Counter-Charge", "Iron Wall", "General Mastery"],
  nodes: [
    {
      nodeId: "LAN-T-DEF",
      doctrine: "Iron Wall",
      name: "Reinforced Plate",
      status: "approved",
      type: "stat",
      ranks: 5,
      effects: [
        {
          kind: "stat",
          rewardKey: "defense_percent",
          stat: "defense",
          mode: "percent",
          valuePerRank: 1,
        },
      ],
    },
    {
      nodeId: "LAN-T-HP",
      doctrine: "Iron Wall",
      name: "Deep Reserves",
      status: "approved",
      type: "stat",
      ranks: 2,
      effects: [
        {
          kind: "stat",
          rewardKey: "hp_flat",
          stat: "max-hp",
          mode: "flat",
          valuePerRank: 20,
        },
      ],
      prerequisites: [
        {
          mode: "all",
          requirements: [{ kind: "node-rank", nodeId: "LAN-T-DEF", rank: 2 }],
        },
      ],
    },
    {
      nodeId: "LAN-T-PWR",
      doctrine: "Counter-Charge",
      name: "Spear Drill",
      status: "approved",
      type: "stat",
      ranks: 1,
      effects: [
        {
          kind: "stat",
          rewardKey: "physical_power_flat",
          stat: "physical-power",
          mode: "flat",
          valuePerRank: 5,
        },
      ],
    },
    {
      nodeId: "LAN-T-BRACE",
      doctrine: "Counter-Charge",
      name: "Set Against the Charge",
      status: "approved",
      type: "major",
      ranks: 1,
      effects: [{ kind: "unlock", rewardKey: "brace_unlock" }],
      prerequisites: [
        {
          mode: "any",
          requirements: [
            { kind: "node-rank", nodeId: "LAN-T-PWR", rank: 1 },
            { kind: "node-rank", nodeId: "LAN-T-DEF", rank: 3 },
          ],
        },
        {
          mode: "all",
          requirements: [{ kind: "total-tree-ranks", ranks: 3 }],
        },
      ],
    },
    {
      nodeId: "LAN-T-CAP",
      doctrine: "General Mastery",
      name: "Lancer Mastery",
      status: "approved",
      type: "capstone",
      ranks: 1,
      effects: [{ kind: "unlock", rewardKey: "lancer_mastery_unlock" }],
      prerequisites: [
        {
          mode: "all",
          requirements: [{ kind: "doctrine-ranks", doctrine: "Iron Wall", ranks: 4 }],
        },
      ],
    },
  ],
};

function advanceOrThrow(
  state: AccountTalentState,
  tree: TalentTreeDefinition,
  nodeId: string,
): AccountTalentState {
  const result = advanceTalentRank(tree, state, nodeId);
  if (result.kind !== "advanced") throw new Error(`Expected ${nodeId} to advance: ${result.reason}`);
  return result.state;
}

describe("GAME-PROG01 account-wide Talent progression", () => {
  it("validates the controlled Lancer scaffold and keeps obsolete Stability history superseded", () => {
    expect(() => validateTalentTreeDefinition(LANCER_CLASS_TALENT_SCAFFOLD)).not.toThrow();
    expect(
      LANCER_CLASS_TALENT_SCAFFOLD.nodes.find((node) => node.nodeId === "LAN-AN-STB-01"),
    ).toMatchObject({ status: "superseded", effects: [] });
    expect(
      advanceTalentRank(
        LANCER_CLASS_TALENT_SCAFFOLD,
        createAccountTalentState(),
        "LAN-AN-STB-01",
      ),
    ).toMatchObject({ kind: "rejected", reason: "not-approved" });
  });

  it("advances approved ranks immutably and enforces ALL/ANY plus investment gates", () => {
    const initial = createAccountTalentState();
    expect(advanceTalentRank(approvedLancerTree, initial, "LAN-T-HP")).toMatchObject({
      kind: "rejected",
      reason: "prerequisite",
    });
    expect(advanceTalentRank(approvedLancerTree, initial, "LAN-T-BRACE")).toMatchObject({
      kind: "rejected",
      reason: "prerequisite",
    });

    let state = advanceOrThrow(initial, approvedLancerTree, "LAN-T-DEF");
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-DEF");
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-PWR");

    const brace = advanceTalentRank(approvedLancerTree, state, "LAN-T-BRACE");
    expect(brace.kind).toBe("advanced");
    expect(talentNodeRank(initial, approvedLancerTree.treeId, "LAN-T-DEF")).toBe(0);
    expect(talentNodeRank(state, approvedLancerTree.treeId, "LAN-T-DEF")).toBe(2);
    expect(unlockedTalentRewardKeys(approvedLancerTree, brace.state)).toEqual(["brace_unlock"]);
  });

  it("enforces doctrine gates, max ranks, stable serialization, and restoration validation", () => {
    let state = createAccountTalentState();
    for (let index = 0; index < 4; index += 1) {
      state = advanceOrThrow(state, approvedLancerTree, "LAN-T-DEF");
    }
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-CAP");
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-DEF");

    expect(advanceTalentRank(approvedLancerTree, state, "LAN-T-DEF")).toMatchObject({
      kind: "rejected",
      reason: "max-rank",
    });

    const serialized = serializeAccountTalentState(state);
    const restored = deserializeAccountTalentState(
      [approvedLancerTree],
      JSON.parse(JSON.stringify(serialized)),
    );
    expect(serializeAccountTalentState(restored)).toEqual(serialized);

    expect(() =>
      deserializeAccountTalentState([approvedLancerTree], {
        trees: [
          {
            treeId: approvedLancerTree.treeId,
            nodes: [{ nodeId: "LAN-T-DEF", rank: 99 }],
          },
        ],
      }),
    ).toThrow(/Invalid serialized Talent rank/);
  });

  it("projects account investment onto matching Classes while preserving Base Speed and Stability", () => {
    let state = createAccountTalentState();
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-DEF");
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-DEF");
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-HP");
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-PWR");

    const lancerProfile = {
      activeClass: "Lancer",
      hp: { current: 80, capacity: 100 },
      attributes: {
        physicalPower: 50,
        magicalPower: 20,
        defense: 100,
        resistance: 60,
        speed: 217,
        stability: 6,
      },
    };
    const infantryProfile = { ...lancerProfile, activeClass: "Infantry" };

    expect(projectClassTalentProfile(lancerProfile, [approvedLancerTree], state)).toEqual({
      activeClass: "Lancer",
      hp: { current: 80, capacity: 120 },
      attributes: {
        physicalPower: 55,
        magicalPower: 20,
        defense: 102,
        resistance: 60,
        speed: 217,
        stability: 6,
      },
    });
    expect(projectClassTalentProfile(infantryProfile, [approvedLancerTree], state)).toEqual(
      infantryProfile,
    );
  });

  it("rejects cycles, unresolved approved purchases, and permanent Base Speed/Stability effects", () => {
    const cyclic: TalentTreeDefinition = {
      schemaVersion: 1,
      treeId: "class:test:cycle",
      family: "class",
      scopeKey: "Test",
      nodes: [
        {
          nodeId: "A",
          doctrine: "One",
          name: "A",
          status: "approved",
          type: "stat",
          ranks: 1,
          effects: [],
          prerequisites: [
            { mode: "all", requirements: [{ kind: "node-rank", nodeId: "B", rank: 1 }] },
          ],
        },
        {
          nodeId: "B",
          doctrine: "One",
          name: "B",
          status: "approved",
          type: "stat",
          ranks: 1,
          effects: [],
          prerequisites: [
            { mode: "all", requirements: [{ kind: "node-rank", nodeId: "A", rank: 1 }] },
          ],
        },
      ],
    };
    expect(() => validateTalentTreeDefinition(cyclic)).toThrow(/cycle/);

    const unresolved: TalentTreeDefinition = {
      schemaVersion: 1,
      treeId: "class:test:pending",
      family: "class",
      scopeKey: "Test",
      nodes: [
        {
          nodeId: "PENDING",
          doctrine: "One",
          name: "Pending",
          status: "approved",
          type: "custom" as TalentTreeDefinition["nodes"][number]["type"],
          ranks: 1,
          effects: [{ kind: "custom", rewardKey: "pending", valuePerRank: null }],
        },
      ],
    };
    expect(advanceTalentRank(unresolved, createAccountTalentState(), "PENDING")).toMatchObject({
      kind: "rejected",
      reason: "balance-pending",
    });

    for (const forbiddenStat of ["speed", "stability"] as const) {
      const forbiddenTree = {
        schemaVersion: 1,
        treeId: `class:test:${forbiddenStat}`,
        family: "class",
        scopeKey: "Test",
        nodes: [
          {
            nodeId: forbiddenStat.toUpperCase(),
            doctrine: "Forbidden",
            name: `Forbidden ${forbiddenStat}`,
            status: "approved",
            type: "stat",
            ranks: 1,
            effects: [
              {
                kind: "stat",
                rewardKey: `${forbiddenStat}_percent`,
                stat: forbiddenStat,
                mode: "percent",
                valuePerRank: 1,
              },
            ],
          },
        ],
      } as unknown as TalentTreeDefinition;
      expect(() => validateTalentTreeDefinition(forbiddenTree)).toThrow(/permanent Base/);
    }
  });
});
