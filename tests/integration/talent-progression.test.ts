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
  doctrines: ["Counter-Charge", "Iron Wall", "Anchor", "General Mastery"],
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
      nodeId: "LAN-T-STB",
      doctrine: "Anchor",
      name: "Firm Footing",
      status: "approved",
      type: "stat",
      ranks: 1,
      effects: [
        {
          kind: "stat",
          rewardKey: "stability_percent",
          stat: "stability",
          mode: "percent",
          valuePerRank: 10,
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
  if (result.kind !== "advanced")
    throw new Error(`Expected ${nodeId} to advance: ${result.reason}`);
  return result.state;
}

describe("GAME-PROG01 account-wide Talent progression", () => {
  it("validates the controlled Lancer scaffold without promoting proposed nodes", () => {
    expect(() => validateTalentTreeDefinition(LANCER_CLASS_TALENT_SCAFFOLD)).not.toThrow();
    const result = advanceTalentRank(
      LANCER_CLASS_TALENT_SCAFFOLD,
      createAccountTalentState(),
      "LAN-CC-PWR-01",
    );
    expect(result).toMatchObject({ kind: "rejected", reason: "not-approved" });
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

  it("automatically projects one account investment onto current and future matching Lancers only", () => {
    let state = createAccountTalentState();
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-DEF");
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-DEF");
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-HP");
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-PWR");
    state = advanceOrThrow(state, approvedLancerTree, "LAN-T-STB");

    const lancerProfile = {
      activeClass: "Lancer",
      hp: { current: 80, capacity: 100 },
      attributes: {
        physicalPower: 50,
        magicalPower: 20,
        defense: 100,
        resistance: 60,
        speed: 17,
        stability: 40,
      },
    };
    const futureLancer = {
      ...lancerProfile,
      hp: { current: 120, capacity: 150 },
      attributes: { ...lancerProfile.attributes, defense: 80, speed: 21 },
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
        speed: 17,
        stability: 44,
      },
    });
    expect(projectClassTalentProfile(futureLancer, [approvedLancerTree], state)).toMatchObject({
      hp: { current: 120, capacity: 170 },
      attributes: { defense: 81.6, speed: 21 },
    });
    expect(projectClassTalentProfile(infantryProfile, [approvedLancerTree], state)).toEqual(
      infantryProfile,
    );
  });

  it("rejects cycles, malformed gates, unresolved approved purchases, and permanent Speed effects", () => {
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
          type: "stat",
          ranks: 1,
          effects: [
            {
              kind: "stat",
              rewardKey: "stability_flat",
              stat: "stability",
              mode: "flat",
              valuePerRank: null,
            },
          ],
        },
      ],
    };
    expect(advanceTalentRank(unresolved, createAccountTalentState(), "PENDING")).toMatchObject({
      kind: "rejected",
      reason: "balance-pending",
    });

    const speedTree = {
      schemaVersion: 1,
      treeId: "class:test:speed",
      family: "class",
      scopeKey: "Test",
      nodes: [
        {
          nodeId: "SPEED",
          doctrine: "Forbidden",
          name: "Forbidden Speed",
          status: "approved",
          type: "stat",
          ranks: 1,
          effects: [
            {
              kind: "stat",
              rewardKey: "speed_percent",
              stat: "speed",
              mode: "percent",
              valuePerRank: 1,
            },
          ],
        },
      ],
    } as unknown as TalentTreeDefinition;
    expect(() => validateTalentTreeDefinition(speedTree)).toThrow(/permanent Speed/);
  });
});
