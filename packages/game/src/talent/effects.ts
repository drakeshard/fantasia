import type { ActorRpgProfile } from "../composition/rpg/actor-state.js";
import type {
  AccountTalentState,
  ClassTalentStatModifiers,
  PermanentTalentStat,
  TalentNodeDefinition,
  TalentNodeEffect,
  TalentStatModifier,
  TalentTreeDefinition,
} from "./model.js";
import { emptyClassTalentStatModifiers } from "./model.js";
import { talentNodeRank, validateTalentTreeDefinition } from "./progression.js";

function addModifier(
  modifier: TalentStatModifier,
  mode: "flat" | "percent",
  amount: number,
): TalentStatModifier {
  return mode === "flat"
    ? { flat: modifier.flat + amount, percent: modifier.percent }
    : { flat: modifier.flat, percent: modifier.percent + amount };
}

function statKey(stat: PermanentTalentStat): keyof ClassTalentStatModifiers {
  switch (stat) {
    case "max-hp":
      return "maxHp";
    case "physical-power":
      return "physicalPower";
    case "magical-power":
      return "magicalPower";
    case "defense":
      return "defense";
    case "resistance":
      return "resistance";
    case "stability":
      return "stability";
  }
}

function resolvedNodeEffects(
  node: TalentNodeDefinition,
  rank: number,
): readonly TalentNodeEffect[] {
  return rank > 0 ? node.effects : [];
}

export function classTalentStatModifiers(
  trees: readonly TalentTreeDefinition[],
  state: AccountTalentState,
  activeClass: string,
): ClassTalentStatModifiers {
  let modifiers = emptyClassTalentStatModifiers();

  for (const tree of trees) {
    validateTalentTreeDefinition(tree);
    if (tree.family !== "class" || tree.scopeKey !== activeClass) continue;

    for (const node of tree.nodes) {
      const rank = talentNodeRank(state, tree.treeId, node.nodeId);
      if (rank <= 0) continue;
      for (const effect of resolvedNodeEffects(node, rank)) {
        if (effect.kind !== "stat" || effect.valuePerRank === null) continue;
        const key = statKey(effect.stat);
        modifiers = {
          ...modifiers,
          [key]: addModifier(modifiers[key], effect.mode, effect.valuePerRank * rank),
        };
      }
    }
  }

  return modifiers;
}

function applyPermanentModifier(base: number, modifier: TalentStatModifier): number {
  return base + modifier.flat + (base * modifier.percent) / 100;
}

export function projectClassTalentProfile(
  profile: ActorRpgProfile,
  trees: readonly TalentTreeDefinition[],
  state: AccountTalentState,
): ActorRpgProfile {
  const modifiers = classTalentStatModifiers(trees, state, profile.activeClass);
  const capacity = applyPermanentModifier(profile.hp.capacity, modifiers.maxHp);

  return {
    activeClass: profile.activeClass,
    hp: {
      current: Math.min(profile.hp.current, capacity),
      capacity,
    },
    attributes: {
      physicalPower: applyPermanentModifier(
        profile.attributes.physicalPower,
        modifiers.physicalPower,
      ),
      magicalPower: applyPermanentModifier(profile.attributes.magicalPower, modifiers.magicalPower),
      defense: applyPermanentModifier(profile.attributes.defense, modifiers.defense),
      resistance: applyPermanentModifier(profile.attributes.resistance, modifiers.resistance),
      speed: profile.attributes.speed,
      stability: applyPermanentModifier(profile.attributes.stability, modifiers.stability),
    },
  };
}

export function unlockedTalentRewardKeys(
  tree: TalentTreeDefinition,
  state: AccountTalentState,
): readonly string[] {
  validateTalentTreeDefinition(tree);
  const unlocked = new Set<string>();
  for (const node of tree.nodes) {
    const rank = talentNodeRank(state, tree.treeId, node.nodeId);
    if (rank <= 0) continue;
    for (const effect of node.effects) {
      if (effect.kind === "unlock") unlocked.add(effect.rewardKey);
    }
  }
  return [...unlocked].sort((left, right) => left.localeCompare(right));
}
