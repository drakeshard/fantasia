export type TalentFamily = "class" | "faction-rule" | "faction-playstyle";

export type TalentNodeStatus = "proposed" | "approved" | "prototype-validated" | "superseded";

export type TalentNodeType =
  | "stat"
  | "matchup"
  | "mechanic-mastery"
  | "major"
  | "capstone"
  | "gate";

export type PermanentTalentStat =
  | "max-hp"
  | "physical-power"
  | "magical-power"
  | "defense"
  | "resistance";

export interface TalentStatEffect {
  readonly kind: "stat";
  readonly rewardKey: string;
  readonly stat: PermanentTalentStat;
  readonly mode: "flat" | "percent";
  readonly valuePerRank: number | null;
}

export interface TalentUnlockEffect {
  readonly kind: "unlock";
  readonly rewardKey: string;
}

export interface TalentMatchupEffect {
  readonly kind: "matchup";
  readonly rewardKey: string;
  readonly mode: "additive-matchup" | "reduction";
  readonly valuePerRank: number | null;
}

export interface TalentCustomEffect {
  readonly kind: "custom";
  readonly rewardKey: string;
  readonly valuePerRank: number | null;
}

export type TalentNodeEffect =
  | TalentStatEffect
  | TalentUnlockEffect
  | TalentMatchupEffect
  | TalentCustomEffect;

export type TalentPrerequisite =
  | Readonly<{
      kind: "node-rank";
      nodeId: string;
      rank: number;
    }>
  | Readonly<{
      kind: "total-tree-ranks";
      ranks: number;
    }>
  | Readonly<{
      kind: "doctrine-ranks";
      doctrine: string;
      ranks: number;
    }>;

export interface TalentPrerequisiteGroup {
  readonly mode: "all" | "any";
  readonly requirements: readonly TalentPrerequisite[];
}

export interface TalentNodeDefinition {
  readonly nodeId: string;
  readonly doctrine: string;
  readonly name: string;
  readonly status: TalentNodeStatus;
  readonly type: TalentNodeType;
  readonly ranks: number;
  readonly effects: readonly TalentNodeEffect[];
  readonly prerequisites?: readonly TalentPrerequisiteGroup[];
  readonly costCurveId?: string;
  readonly layoutBand?: string;
  readonly notes?: string;
}

export interface TalentCostCurveDefinition {
  readonly costCurveId: string;
  readonly costsByRank: readonly number[];
}

export interface TalentTreeDefinition {
  readonly schemaVersion: 1;
  readonly treeId: string;
  readonly family: TalentFamily;
  readonly scopeKey: string;
  readonly doctrines?: readonly string[];
  readonly nodes: readonly TalentNodeDefinition[];
  readonly costCurves?: readonly TalentCostCurveDefinition[];
}

export interface TalentNodeInvestment {
  readonly nodeId: string;
  readonly rank: number;
}

export interface TalentTreeInvestment {
  readonly treeId: string;
  readonly nodes: readonly TalentNodeInvestment[];
}

export interface AccountTalentState {
  readonly trees: readonly TalentTreeInvestment[];
}

export interface SerializedAccountTalentState {
  readonly trees: readonly TalentTreeInvestment[];
}

export interface TalentStatModifier {
  readonly flat: number;
  readonly percent: number;
}

export interface ClassTalentStatModifiers {
  readonly maxHp: TalentStatModifier;
  readonly physicalPower: TalentStatModifier;
  readonly magicalPower: TalentStatModifier;
  readonly defense: TalentStatModifier;
  readonly resistance: TalentStatModifier;
}

const emptyModifier = (): TalentStatModifier => ({ flat: 0, percent: 0 });

export function emptyClassTalentStatModifiers(): ClassTalentStatModifiers {
  return {
    maxHp: emptyModifier(),
    physicalPower: emptyModifier(),
    magicalPower: emptyModifier(),
    defense: emptyModifier(),
    resistance: emptyModifier(),
  };
}
