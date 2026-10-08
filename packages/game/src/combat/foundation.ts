import type { ActorId } from "../actors/identity.js";
import { actorIdsEqual } from "../actors/identity.js";
import { battlefieldReadModel } from "../battlefield/read-model.js";
import type { BattlefieldState } from "../battlefield/state.js";
import { actorRpgProfile, type ActorRpgState } from "../composition/rpg/actor-state.js";
import { damageActorHp } from "../composition/rpg/hp.js";
import type { ActorIdentityState } from "../composition/tactical/actor-identity.js";

export type CombatSide = "player" | "enemy";
export type DamageCategory = "physical" | "magical" | "piercing";
export type CombatElement =
  | "fire"
  | "water"
  | "ice"
  | "lightning"
  | "wind"
  | "earth"
  | "light"
  | "dark"
  | "arcane";
export type AttackScaling = "physical-power" | "magical-power";

export interface CombatParticipant {
  readonly actorId: ActorId;
  readonly side: CombatSide;
}

export interface DirectAttackDefinition {
  readonly reference: string;
  readonly scaling: AttackScaling;
  readonly coefficient: number;
  readonly damageCategory: DamageCategory;
  readonly element?: CombatElement;
  readonly horizontalRange: Readonly<{ min: number; max: number }>;
  readonly horizontalRangeMetric: "manhattan";
  readonly elevationReach: Readonly<{ upward: number; downward: number }>;
  readonly hitChance: number;
  readonly criticalChance: number;
  readonly criticalMultiplier: number;
}

export interface AttackResolutionRolls {
  readonly hit: number;
  readonly critical: number;
}

export interface DamageMitigationInput {
  readonly kind: "defense" | "resistance";
  readonly value: number;
}

export interface DamagePolicyInput {
  readonly power: number;
  readonly coefficient: number;
  readonly mitigation: DamageMitigationInput | null;
  readonly effectiveness: number;
  readonly criticalMultiplier: number;
}

export type DamagePolicy = (input: DamagePolicyInput) => number;

export interface CombatEffectiveness {
  readonly classMultiplier: number;
  readonly damageCategoryMultiplier: number;
  readonly elementalMultiplier: number;
  readonly combinedMultiplier: number;
}

export interface DirectAttackResolvedEvent {
  readonly kind: "direct-attack-resolved";
  readonly attackReference: string;
  readonly attackerId: ActorId;
  readonly defenderId: ActorId;
  readonly critical: boolean;
  readonly requestedDamage: number;
  readonly appliedDamage: number;
  readonly hpBefore: number;
  readonly hpAfter: number;
  readonly effectiveness: CombatEffectiveness;
}

export type DirectAttackOutcome =
  | Readonly<{
      kind: "resolved";
      rpg: ActorRpgState;
      event: DirectAttackResolvedEvent;
    }>
  | Readonly<{
      kind: "missed";
      rpg: ActorRpgState;
      attackReference: string;
      attackerId: ActorId;
      defenderId: ActorId;
    }>
  | Readonly<{
      kind: "rejected";
      rpg: ActorRpgState;
      reason:
        | "invalid-definition"
        | "invalid-rolls"
        | "unknown-attacker"
        | "unknown-defender"
        | "same-side-target"
        | "attacker-not-placed"
        | "defender-not-placed"
        | "out-of-range"
        | "out-of-elevation-reach";
    }>;

function classEffectiveness(attackerClass: string, defenderClass: string): number {
  const pair = `${attackerClass}->${defenderClass}`;
  const multipliers: Readonly<Record<string, number>> = {
    "Infantry->Lancer": 1.35,
    "Infantry->Cavalry": 0.8,
    "Lancer->Cavalry": 1.35,
    "Lancer->Infantry": 0.8,
    "Cavalry->Infantry": 1.35,
    "Cavalry->Lancer": 0.8,
    "Archer->Flyer": 1.35,
    "Flyer->Archer": 0.8,
    "Holy->Demon": 2,
    "Demon->Holy": 0.5,
  };
  return multipliers[pair] ?? 1;
}

function categoryEffectiveness(category: DamageCategory, defenderClass: string): number {
  if (category === "magical") {
    if (defenderClass === "Flyer" || defenderClass === "Sorcerer") return 0.9;
    if (defenderClass === "Aquatic") return 1.1;
  }
  if (category === "physical") {
    if (defenderClass === "Sorcerer") return 1.1;
    if (defenderClass === "Demon") return 0.9;
  }
  return 1;
}

function elementalEffectiveness(element: CombatElement | undefined, defenderClass: string): number {
  if (element === undefined) return 1;
  if (element === "fire" && defenderClass === "Infantry") return 1.25;
  if (element === "ice" && defenderClass === "Lancer") return 1.25;
  if (element === "lightning" && (defenderClass === "Cavalry" || defenderClass === "Aquatic")) {
    return 1.25;
  }
  if (element === "wind" && defenderClass === "Flyer") return 1.35;
  if (element === "light" && defenderClass === "Demon") return 1.25;
  if (element === "light" && defenderClass === "Holy") return 0.9;
  if (element === "dark" && defenderClass === "Holy") return 1.25;
  return 1;
}

export function combatEffectiveness(
  attackerClass: string,
  defenderClass: string,
  damageCategory: DamageCategory,
  element?: CombatElement,
): CombatEffectiveness {
  const classMultiplier = classEffectiveness(attackerClass, defenderClass);
  const damageCategoryMultiplier = categoryEffectiveness(damageCategory, defenderClass);
  const elementalMultiplier = elementalEffectiveness(element, defenderClass);
  return {
    classMultiplier,
    damageCategoryMultiplier,
    elementalMultiplier,
    combinedMultiplier:
      1 +
      (classMultiplier - 1) +
      (damageCategoryMultiplier - 1) +
      (elementalMultiplier - 1),
  };
}

function participantFor(
  participants: readonly CombatParticipant[],
  actorId: ActorId,
): CombatParticipant | undefined {
  return participants.find((participant) => actorIdsEqual(participant.actorId, actorId));
}

function validChance(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1;
}

function validDefinition(definition: DirectAttackDefinition): boolean {
  return (
    definition.reference.length > 0 &&
    Number.isFinite(definition.coefficient) &&
    definition.coefficient >= 0 &&
    Number.isSafeInteger(definition.horizontalRange.min) &&
    definition.horizontalRange.min >= 0 &&
    Number.isSafeInteger(definition.horizontalRange.max) &&
    definition.horizontalRange.max >= definition.horizontalRange.min &&
    Number.isSafeInteger(definition.elevationReach.upward) &&
    definition.elevationReach.upward >= 0 &&
    Number.isSafeInteger(definition.elevationReach.downward) &&
    definition.elevationReach.downward >= 0 &&
    validChance(definition.hitChance) &&
    validChance(definition.criticalChance) &&
    Number.isFinite(definition.criticalMultiplier) &&
    definition.criticalMultiplier >= 1
  );
}

function validRoll(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value < 1;
}

function mitigationFor(
  definition: DirectAttackDefinition,
  defender: NonNullable<ReturnType<typeof actorRpgProfile>>,
): DamageMitigationInput | null {
  if (definition.damageCategory === "physical") {
    return { kind: "defense", value: defender.attributes.defense };
  }
  if (definition.damageCategory === "magical") {
    return { kind: "resistance", value: defender.attributes.resistance };
  }
  return null;
}

export function resolveDirectAttack(input: Readonly<{
  definition: DirectAttackDefinition;
  attackerId: ActorId;
  defenderId: ActorId;
  participants: readonly CombatParticipant[];
  rpg: ActorRpgState;
  battlefield: BattlefieldState;
  identities: ActorIdentityState;
  rolls: AttackResolutionRolls;
  damagePolicy: DamagePolicy;
}>): DirectAttackOutcome {
  const { definition } = input;
  if (!validDefinition(definition)) {
    return { kind: "rejected", rpg: input.rpg, reason: "invalid-definition" };
  }
  if (!validRoll(input.rolls.hit) || !validRoll(input.rolls.critical)) {
    return { kind: "rejected", rpg: input.rpg, reason: "invalid-rolls" };
  }

  const attackerParticipant = participantFor(input.participants, input.attackerId);
  const defenderParticipant = participantFor(input.participants, input.defenderId);
  const attacker = actorRpgProfile(input.rpg, input.attackerId);
  const defender = actorRpgProfile(input.rpg, input.defenderId);
  if (attackerParticipant === undefined || attacker === undefined) {
    return { kind: "rejected", rpg: input.rpg, reason: "unknown-attacker" };
  }
  if (defenderParticipant === undefined || defender === undefined) {
    return { kind: "rejected", rpg: input.rpg, reason: "unknown-defender" };
  }
  if (attackerParticipant.side === defenderParticipant.side) {
    return { kind: "rejected", rpg: input.rpg, reason: "same-side-target" };
  }

  const battlefield = battlefieldReadModel(input.battlefield, input.identities);
  const attackerCell = battlefield.cells.find(
    (cell) => cell.actorId !== undefined && actorIdsEqual(cell.actorId, input.attackerId),
  );
  const defenderCell = battlefield.cells.find(
    (cell) => cell.actorId !== undefined && actorIdsEqual(cell.actorId, input.defenderId),
  );
  if (attackerCell === undefined) {
    return { kind: "rejected", rpg: input.rpg, reason: "attacker-not-placed" };
  }
  if (defenderCell === undefined) {
    return { kind: "rejected", rpg: input.rpg, reason: "defender-not-placed" };
  }

  const horizontalDistance =
    Math.abs(attackerCell.coord.x - defenderCell.coord.x) +
    Math.abs(attackerCell.coord.y - defenderCell.coord.y);
  if (
    horizontalDistance < definition.horizontalRange.min ||
    horizontalDistance > definition.horizontalRange.max
  ) {
    return { kind: "rejected", rpg: input.rpg, reason: "out-of-range" };
  }

  const elevationDifference = defenderCell.elevation - attackerCell.elevation;
  if (
    elevationDifference > definition.elevationReach.upward ||
    -elevationDifference > definition.elevationReach.downward
  ) {
    return { kind: "rejected", rpg: input.rpg, reason: "out-of-elevation-reach" };
  }

  if (input.rolls.hit >= definition.hitChance) {
    return {
      kind: "missed",
      rpg: input.rpg,
      attackReference: definition.reference,
      attackerId: input.attackerId,
      defenderId: input.defenderId,
    };
  }

  const critical = input.rolls.critical < definition.criticalChance;
  const effectiveness = combatEffectiveness(
    attacker.activeClass,
    defender.activeClass,
    definition.damageCategory,
    definition.element,
  );
  const power =
    definition.scaling === "physical-power"
      ? attacker.attributes.physicalPower
      : attacker.attributes.magicalPower;
  const requestedDamage = input.damagePolicy({
    power,
    coefficient: definition.coefficient,
    mitigation: mitigationFor(definition, defender),
    effectiveness: effectiveness.combinedMultiplier,
    criticalMultiplier: critical ? definition.criticalMultiplier : 1,
  });
  if (!Number.isSafeInteger(requestedDamage) || requestedDamage < 0) {
    throw new RangeError("Fantasia damage policy must return a non-negative safe integer");
  }

  const hp = damageActorHp(input.rpg, input.defenderId, requestedDamage);
  if (hp.kind === "rejected") {
    throw new Error(`RPG HP transition rejected after validated attack: ${hp.reason}`);
  }

  return {
    kind: "resolved",
    rpg: hp.state,
    event: {
      kind: "direct-attack-resolved",
      attackReference: definition.reference,
      attackerId: input.attackerId,
      defenderId: input.defenderId,
      critical,
      requestedDamage,
      appliedDamage: hp.applied,
      hpBefore: hp.previousCurrent,
      hpAfter: hp.current,
      effectiveness,
    },
  };
}

/**
 * Development-only formula used to exercise combat state before the canonical
 * mitigation formula/order is approved. Do not treat this as a balance rule.
 */
export const developmentGrayboxDamagePolicy: DamagePolicy = (input) => {
  const scaled = input.power * input.coefficient;
  const mitigated = Math.max(0, scaled - (input.mitigation?.value ?? 0));
  return Math.max(
    0,
    Math.round(mitigated * input.effectiveness * input.criticalMultiplier),
  );
};
