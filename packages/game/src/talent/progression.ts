import type {
  AccountTalentState,
  SerializedAccountTalentState,
  TalentNodeDefinition,
  TalentNodeEffect,
  TalentPrerequisite,
  TalentPrerequisiteGroup,
  TalentTreeDefinition,
  TalentTreeInvestment,
} from "./model.js";

const positiveInteger = (value: number): boolean => Number.isInteger(value) && value > 0;
const nonNegativeFinite = (value: number): boolean => Number.isFinite(value) && value >= 0;

function validateEffect(treeId: string, node: TalentNodeDefinition, effect: TalentNodeEffect): void {
  if (effect.rewardKey.trim().length === 0) {
    throw new RangeError(`Talent node ${node.nodeId} in ${treeId} has an empty reward key`);
  }

  if (effect.kind === "stat") {
    if ((effect as { stat?: string }).stat === "speed") {
      throw new RangeError(`Talent node ${node.nodeId} attempts to modify permanent Speed`);
    }
    if (effect.valuePerRank !== null && !Number.isFinite(effect.valuePerRank)) {
      throw new RangeError(`Talent node ${node.nodeId} has an invalid stat value`);
    }
    return;
  }

  if (effect.kind === "matchup" || effect.kind === "custom") {
    if (effect.valuePerRank !== null && !Number.isFinite(effect.valuePerRank)) {
      throw new RangeError(`Talent node ${node.nodeId} has an invalid effect value`);
    }
  }
}

function validateRequirement(
  tree: TalentTreeDefinition,
  nodeIds: ReadonlySet<string>,
  node: TalentNodeDefinition,
  requirement: TalentPrerequisite,
): void {
  if (requirement.kind === "node-rank") {
    if (!nodeIds.has(requirement.nodeId)) {
      throw new RangeError(
        `Talent node ${node.nodeId} references unknown prerequisite ${requirement.nodeId}`,
      );
    }
    if (requirement.nodeId === node.nodeId) {
      throw new RangeError(`Talent node ${node.nodeId} cannot require itself`);
    }
    if (!positiveInteger(requirement.rank)) {
      throw new RangeError(`Talent node ${node.nodeId} has an invalid prerequisite rank`);
    }
    const prerequisiteNode = tree.nodes.find((entry) => entry.nodeId === requirement.nodeId);
    if (prerequisiteNode === undefined || requirement.rank > prerequisiteNode.ranks) {
      throw new RangeError(`Talent node ${node.nodeId} requires an impossible prerequisite rank`);
    }
    return;
  }

  if (!positiveInteger(requirement.ranks)) {
    throw new RangeError(`Talent node ${node.nodeId} has an invalid investment gate`);
  }

  if (requirement.kind === "doctrine-ranks" && requirement.doctrine.trim().length === 0) {
    throw new RangeError(`Talent node ${node.nodeId} has an empty doctrine gate`);
  }
}

function prerequisiteNodeIds(node: TalentNodeDefinition): readonly string[] {
  const ids: string[] = [];
  for (const group of node.prerequisites ?? []) {
    for (const requirement of group.requirements) {
      if (requirement.kind === "node-rank") ids.push(requirement.nodeId);
    }
  }
  return ids;
}

function rejectCycles(tree: TalentTreeDefinition): void {
  const byId = new Map(tree.nodes.map((node) => [node.nodeId, node]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (nodeId: string): void => {
    if (visited.has(nodeId)) return;
    if (visiting.has(nodeId)) {
      throw new RangeError(`Talent tree ${tree.treeId} contains a prerequisite cycle at ${nodeId}`);
    }
    visiting.add(nodeId);
    const node = byId.get(nodeId);
    if (node !== undefined) {
      for (const prerequisiteId of prerequisiteNodeIds(node)) visit(prerequisiteId);
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const node of tree.nodes) visit(node.nodeId);
}

export function validateTalentTreeDefinition(tree: TalentTreeDefinition): void {
  if (tree.schemaVersion !== 1) throw new RangeError(`Unsupported Talent schema in ${tree.treeId}`);
  if (tree.treeId.trim().length === 0) throw new RangeError("Talent tree ID cannot be empty");
  if (tree.scopeKey.trim().length === 0) throw new RangeError(`Talent tree ${tree.treeId} has empty scope`);

  const nodeIds = new Set<string>();
  for (const node of tree.nodes) {
    if (node.nodeId.trim().length === 0) throw new RangeError(`Talent tree ${tree.treeId} has empty node ID`);
    if (nodeIds.has(node.nodeId)) throw new RangeError(`Duplicate Talent node ID: ${node.nodeId}`);
    nodeIds.add(node.nodeId);
    if (node.doctrine.trim().length === 0) throw new RangeError(`Talent node ${node.nodeId} has empty doctrine`);
    if (node.name.trim().length === 0) throw new RangeError(`Talent node ${node.nodeId} has empty name`);
    if (!positiveInteger(node.ranks)) throw new RangeError(`Talent node ${node.nodeId} has invalid ranks`);
    for (const effect of node.effects) validateEffect(tree.treeId, node, effect);
  }

  const costCurveIds = new Set<string>();
  for (const curve of tree.costCurves ?? []) {
    if (curve.costCurveId.trim().length === 0) throw new RangeError(`Talent tree ${tree.treeId} has empty cost curve ID`);
    if (costCurveIds.has(curve.costCurveId)) throw new RangeError(`Duplicate Talent cost curve: ${curve.costCurveId}`);
    costCurveIds.add(curve.costCurveId);
    if (curve.costsByRank.length === 0 || curve.costsByRank.some((cost) => !nonNegativeFinite(cost))) {
      throw new RangeError(`Talent cost curve ${curve.costCurveId} is invalid`);
    }
  }

  for (const node of tree.nodes) {
    if (node.costCurveId !== undefined && !costCurveIds.has(node.costCurveId)) {
      throw new RangeError(`Talent node ${node.nodeId} references unknown cost curve ${node.costCurveId}`);
    }
    for (const group of node.prerequisites ?? []) {
      if (group.requirements.length === 0) {
        throw new RangeError(`Talent node ${node.nodeId} has an empty prerequisite group`);
      }
      for (const requirement of group.requirements) validateRequirement(tree, nodeIds, node, requirement);
    }
  }

  rejectCycles(tree);
}

export function validateTalentCatalog(trees: readonly TalentTreeDefinition[]): void {
  const treeIds = new Set<string>();
  for (const tree of trees) {
    if (treeIds.has(tree.treeId)) throw new RangeError(`Duplicate Talent tree ID: ${tree.treeId}`);
    treeIds.add(tree.treeId);
    validateTalentTreeDefinition(tree);
  }
}

export function createAccountTalentState(): AccountTalentState {
  return { trees: [] };
}

function treeInvestment(state: AccountTalentState, treeId: string): TalentTreeInvestment | undefined {
  return state.trees.find((tree) => tree.treeId === treeId);
}

export function talentNodeRank(state: AccountTalentState, treeId: string, nodeId: string): number {
  return treeInvestment(state, treeId)?.nodes.find((node) => node.nodeId === nodeId)?.rank ?? 0;
}

export function talentTreeRanks(state: AccountTalentState, treeId: string): number {
  return treeInvestment(state, treeId)?.nodes.reduce((sum, node) => sum + node.rank, 0) ?? 0;
}

export function talentDoctrineRanks(
  tree: TalentTreeDefinition,
  state: AccountTalentState,
  doctrine: string,
): number {
  const nodesById = new Map(tree.nodes.map((node) => [node.nodeId, node]));
  return (
    treeInvestment(state, tree.treeId)?.nodes.reduce((sum, investment) => {
      return sum + (nodesById.get(investment.nodeId)?.doctrine === doctrine ? investment.rank : 0);
    }, 0) ?? 0
  );
}

function requirementMet(
  tree: TalentTreeDefinition,
  state: AccountTalentState,
  requirement: TalentPrerequisite,
): boolean {
  if (requirement.kind === "node-rank") {
    return talentNodeRank(state, tree.treeId, requirement.nodeId) >= requirement.rank;
  }
  if (requirement.kind === "total-tree-ranks") {
    return talentTreeRanks(state, tree.treeId) >= requirement.ranks;
  }
  return talentDoctrineRanks(tree, state, requirement.doctrine) >= requirement.ranks;
}

function prerequisiteGroupMet(
  tree: TalentTreeDefinition,
  state: AccountTalentState,
  group: TalentPrerequisiteGroup,
): boolean {
  const results = group.requirements.map((requirement) => requirementMet(tree, state, requirement));
  return group.mode === "all" ? results.every(Boolean) : results.some(Boolean);
}

export type AdvanceTalentRankResult =
  | Readonly<{ kind: "advanced"; state: AccountTalentState; rank: number }>
  | Readonly<{
      kind: "rejected";
      reason: "unknown-node" | "not-approved" | "balance-pending" | "max-rank" | "prerequisite";
      state: AccountTalentState;
    }>;

function nodeHasResolvedEffects(node: TalentNodeDefinition): boolean {
  return node.effects.every((effect) => {
    if (effect.kind === "unlock") return true;
    return effect.valuePerRank !== null;
  });
}

export function advanceTalentRank(
  tree: TalentTreeDefinition,
  state: AccountTalentState,
  nodeId: string,
): AdvanceTalentRankResult {
  validateTalentTreeDefinition(tree);
  const node = tree.nodes.find((entry) => entry.nodeId === nodeId);
  if (node === undefined) return { kind: "rejected", reason: "unknown-node", state };
  if (node.status !== "approved" && node.status !== "prototype-validated") {
    return { kind: "rejected", reason: "not-approved", state };
  }
  if (!nodeHasResolvedEffects(node)) {
    return { kind: "rejected", reason: "balance-pending", state };
  }

  const currentRank = talentNodeRank(state, tree.treeId, nodeId);
  if (currentRank >= node.ranks) return { kind: "rejected", reason: "max-rank", state };
  if ((node.prerequisites ?? []).some((group) => !prerequisiteGroupMet(tree, state, group))) {
    return { kind: "rejected", reason: "prerequisite", state };
  }

  const nextTrees = state.trees.map((treeState) => ({
    treeId: treeState.treeId,
    nodes: treeState.nodes.map((investment) => ({ ...investment })),
  }));
  let targetTree = nextTrees.find((entry) => entry.treeId === tree.treeId);
  if (targetTree === undefined) {
    targetTree = { treeId: tree.treeId, nodes: [] };
    nextTrees.push(targetTree);
  }
  const nextNodes = [...targetTree.nodes];
  const nodeIndex = nextNodes.findIndex((entry) => entry.nodeId === nodeId);
  if (nodeIndex >= 0) nextNodes[nodeIndex] = { nodeId, rank: currentRank + 1 };
  else nextNodes.push({ nodeId, rank: 1 });

  const nextState: AccountTalentState = {
    trees: nextTrees
      .map((entry) => ({
        treeId: entry.treeId,
        nodes: (entry.treeId === tree.treeId ? nextNodes : entry.nodes)
          .map((nodeInvestment) => ({ ...nodeInvestment }))
          .sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
      }))
      .sort((left, right) => left.treeId.localeCompare(right.treeId)),
  };

  return { kind: "advanced", state: nextState, rank: currentRank + 1 };
}

export function serializeAccountTalentState(state: AccountTalentState): SerializedAccountTalentState {
  return {
    trees: state.trees
      .map((tree) => ({
        treeId: tree.treeId,
        nodes: tree.nodes
          .map((node) => ({ nodeId: node.nodeId, rank: node.rank }))
          .sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
      }))
      .sort((left, right) => left.treeId.localeCompare(right.treeId)),
  };
}

export function deserializeAccountTalentState(
  definitions: readonly TalentTreeDefinition[],
  serialized: SerializedAccountTalentState,
): AccountTalentState {
  validateTalentCatalog(definitions);
  const definitionsById = new Map(definitions.map((tree) => [tree.treeId, tree]));
  const seenTreeIds = new Set<string>();
  const trees: TalentTreeInvestment[] = [];

  for (const serializedTree of serialized.trees) {
    if (seenTreeIds.has(serializedTree.treeId)) {
      throw new RangeError(`Duplicate serialized Talent tree: ${serializedTree.treeId}`);
    }
    seenTreeIds.add(serializedTree.treeId);
    const definition = definitionsById.get(serializedTree.treeId);
    if (definition === undefined) throw new RangeError(`Unknown serialized Talent tree: ${serializedTree.treeId}`);
    const nodesById = new Map(definition.nodes.map((node) => [node.nodeId, node]));
    const seenNodeIds = new Set<string>();
    const nodes = serializedTree.nodes.map((investment) => {
      if (seenNodeIds.has(investment.nodeId)) {
        throw new RangeError(`Duplicate serialized Talent node: ${investment.nodeId}`);
      }
      seenNodeIds.add(investment.nodeId);
      const node = nodesById.get(investment.nodeId);
      if (node === undefined) throw new RangeError(`Unknown serialized Talent node: ${investment.nodeId}`);
      if (!positiveInteger(investment.rank) || investment.rank > node.ranks) {
        throw new RangeError(`Invalid serialized Talent rank: ${investment.nodeId}`);
      }
      if (node.status === "superseded") {
        throw new RangeError(`Serialized Talent node is superseded: ${investment.nodeId}`);
      }
      return { nodeId: investment.nodeId, rank: investment.rank };
    });
    trees.push({
      treeId: serializedTree.treeId,
      nodes: nodes.sort((left, right) => left.nodeId.localeCompare(right.nodeId)),
    });
  }

  return { trees: trees.sort((left, right) => left.treeId.localeCompare(right.treeId)) };
}
