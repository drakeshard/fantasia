import {
  LANCER_CLASS_TALENT_SCAFFOLD,
  type TalentNodeDefinition,
  type TalentNodeEffect,
  type TalentNodeStatus,
  type TalentPrerequisite,
  type TalentPrerequisiteGroup,
  type TalentTreeDefinition,
} from "@fantasia/game";

export type TalentFamilyViewId = "class" | "faction-rule" | "faction-playstyle";

export interface TalentFamilyView {
  readonly id: TalentFamilyViewId;
  readonly label: string;
  readonly description: string;
  readonly available: boolean;
  readonly treeCount: number;
}

export type TalentPrerequisiteView =
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

export interface TalentPrerequisiteGroupView {
  readonly mode: "all" | "any";
  readonly requirements: readonly TalentPrerequisiteView[];
}

export interface TalentNodeView {
  readonly nodeId: string;
  readonly name: string;
  readonly doctrine: string;
  readonly type: string;
  readonly status: TalentNodeStatus;
  readonly statusLabel: string;
  readonly ranks: number;
  readonly rewardLabel: string;
  readonly prerequisiteGroups: readonly TalentPrerequisiteGroupView[];
  readonly layoutBand?: string;
  readonly notes?: string;
}

export interface TalentDoctrineView {
  readonly name: string;
  readonly nodes: readonly TalentNodeView[];
}

export interface ClassTalentTreeView {
  readonly treeId: string;
  readonly className: string;
  readonly doctrines: readonly TalentDoctrineView[];
  readonly nodeCount: number;
  readonly totalRankCapacity: number;
}

export interface TalentMenuView {
  readonly families: readonly TalentFamilyView[];
  readonly classTrees: readonly ClassTalentTreeView[];
}

const FAMILY_VIEWS: readonly TalentFamilyView[] = [
  {
    id: "class",
    label: "Class Talent",
    description: "Permanent account-wide growth shared by every unit using the matching Class.",
    available: true,
    treeCount: 1,
  },
  {
    id: "faction-rule",
    label: "Faction Rule Talent",
    description: "Account-wide progression for stage-rule faction mastery.",
    available: false,
    treeCount: 0,
  },
  {
    id: "faction-playstyle",
    label: "Faction Playstyle Talent",
    description: "Account-wide progression for faction synergy and playstyle mastery.",
    available: false,
    treeCount: 0,
  },
];

function statusLabel(status: TalentNodeStatus): string {
  switch (status) {
    case "approved":
      return "Approved principle";
    case "prototype-validated":
      return "Prototype validated";
    case "proposed":
      return "Proposed";
    case "superseded":
      return "Superseded";
  }
}

function formatReward(effect: TalentNodeEffect): string {
  if (effect.kind === "unlock") return "Mechanic unlock";
  if (effect.valuePerRank === null) return "Value pending";

  const reward = effect.rewardKey.replaceAll("_", " ");
  if (effect.kind === "stat") {
    const amount =
      effect.mode === "percent" ? `+${effect.valuePerRank}%` : `+${effect.valuePerRank}`;
    return `${amount} ${reward} / rank`;
  }

  return `${effect.valuePerRank} ${reward} / rank`;
}

function prerequisiteView(requirement: TalentPrerequisite): TalentPrerequisiteView {
  switch (requirement.kind) {
    case "node-rank":
      return { kind: "node-rank", nodeId: requirement.nodeId, rank: requirement.rank };
    case "total-tree-ranks":
      return { kind: "total-tree-ranks", ranks: requirement.ranks };
    case "doctrine-ranks":
      return {
        kind: "doctrine-ranks",
        doctrine: requirement.doctrine,
        ranks: requirement.ranks,
      };
  }
}

function prerequisiteGroupView(group: TalentPrerequisiteGroup): TalentPrerequisiteGroupView {
  return {
    mode: group.mode,
    requirements: group.requirements.map(prerequisiteView),
  };
}

function nodeView(node: TalentNodeDefinition): TalentNodeView {
  const rewards = node.effects.map(formatReward).join(" · ");
  const rewardLabel =
    rewards.length > 0
      ? rewards
      : node.status === "superseded"
        ? "No active reward"
        : "Reward pending";
  return {
    nodeId: node.nodeId,
    name: node.name,
    doctrine: node.doctrine,
    type: node.type,
    status: node.status,
    statusLabel: statusLabel(node.status),
    ranks: node.ranks,
    rewardLabel,
    prerequisiteGroups: (node.prerequisites ?? []).map(prerequisiteGroupView),
    ...(node.layoutBand === undefined ? {} : { layoutBand: node.layoutBand }),
    ...(node.notes === undefined ? {} : { notes: node.notes }),
  };
}

function classTreeView(tree: TalentTreeDefinition): ClassTalentTreeView {
  const doctrines = (tree.doctrines ?? []).map((doctrine) => ({
    name: doctrine,
    nodes: tree.nodes.filter((node) => node.doctrine === doctrine).map(nodeView),
  }));

  return {
    treeId: tree.treeId,
    className: tree.scopeKey,
    doctrines,
    nodeCount: tree.nodes.length,
    totalRankCapacity: tree.nodes.reduce((sum, node) => sum + node.ranks, 0),
  };
}

export class TalentMenuSession {
  view(): TalentMenuView {
    return {
      families: FAMILY_VIEWS,
      classTrees: [classTreeView(LANCER_CLASS_TALENT_SCAFFOLD)],
    };
  }
}
