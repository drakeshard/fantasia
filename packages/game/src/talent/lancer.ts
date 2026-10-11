import type { TalentTreeDefinition } from "./model.js";

/**
 * Controlled GAME-TALENT-001 scaffold only.
 *
 * Proposed nodes remain non-purchasable through the production transition until their
 * design status is approved. The Anchor sample intentionally retains a null value while
 * its Stability scale is unresolved. This is not the proposed 51-node full tree.
 */
export const LANCER_CLASS_TALENT_SCAFFOLD: TalentTreeDefinition = {
  schemaVersion: 1,
  treeId: "class:lancer:v0.1-scaffold",
  family: "class",
  scopeKey: "Lancer",
  doctrines: ["Counter-Charge", "Iron Wall", "Anchor", "General Mastery"],
  nodes: [
    {
      nodeId: "LAN-CC-PWR-01",
      doctrine: "Counter-Charge",
      name: "Spear Drill I",
      status: "proposed",
      type: "stat",
      ranks: 5,
      effects: [
        {
          kind: "stat",
          rewardKey: "physical_power_percent",
          stat: "physical-power",
          mode: "percent",
          valuePerRank: 1,
        },
      ],
      layoutBand: "early",
      notes: "Entry offensive progression; proposed sample record from GAME-TALENT-001.",
    },
    {
      nodeId: "LAN-CC-BRACE-01",
      doctrine: "Counter-Charge",
      name: "Set Against the Charge",
      status: "approved",
      type: "major",
      ranks: 1,
      effects: [{ kind: "unlock", rewardKey: "brace_unlock" }],
      prerequisites: [
        {
          mode: "all",
          requirements: [{ kind: "node-rank", nodeId: "LAN-CC-PWR-01", rank: 1 }],
        },
      ],
      layoutBand: "early-major",
      notes:
        "Brace principle is approved; movement qualification, reduction value, cap, stacking, and order remain unresolved.",
    },
    {
      nodeId: "LAN-IW-DEF-01",
      doctrine: "Iron Wall",
      name: "Reinforced Plate I",
      status: "proposed",
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
      layoutBand: "early",
      notes: "Lancer specialty stat node; proposed sample record from GAME-TALENT-001.",
    },
    {
      nodeId: "LAN-AN-STB-01",
      doctrine: "Anchor",
      name: "Firm Footing I",
      status: "proposed",
      type: "stat",
      ranks: 5,
      effects: [
        {
          kind: "stat",
          rewardKey: "stability_flat",
          stat: "stability",
          mode: "flat",
          valuePerRank: null,
        },
      ],
      layoutBand: "early",
      notes: "Stability value remains balance-pending in GAME-TALENT-001.",
    },
    {
      nodeId: "LAN-GM-RES-01",
      doctrine: "General Mastery",
      name: "Tempered Mind I",
      status: "proposed",
      type: "stat",
      ranks: 5,
      effects: [
        {
          kind: "stat",
          rewardKey: "resistance_percent",
          stat: "resistance",
          mode: "percent",
          valuePerRank: 1,
        },
      ],
      layoutBand: "early",
      notes:
        "Useful connector progression at lower density than Lancer Defense; proposed sample record.",
    },
  ],
};
