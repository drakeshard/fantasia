import type { SquareCoord } from "@drakeshard/tactical/square";
import {
  type ActorId,
  actorIdsEqual,
  deserializeActorId,
  serializeActorId,
} from "../actors/identity.js";
import {
  deserializeBattlefieldState,
  type SerializedBattlefieldState,
  serializeBattlefieldState,
} from "../battlefield/state.js";
import type {
  CombatEffectiveness,
  DirectAttackResolvedEvent,
} from "../combat/foundation.js";
import {
  type ActorRpgDefinition,
  deserializeActorRpgState,
  type SerializedActorRpgState,
  serializeActorRpgState,
} from "../composition/rpg/actor-state.js";
import {
  type EncounterDefinition,
  type EncounterEvent,
  type EncounterOutcome,
  type EncounterState,
  encounterOutcome,
} from "./loop.js";
import type { EncounterTurnState } from "./turns.js";

export interface SerializedEncounterTurnState {
  readonly round: number;
  readonly pendingActorIds: readonly string[];
  readonly activeActorId: string;
  readonly movementRemaining: number;
  readonly mainActAvailable: boolean;
}

export type SerializedEncounterEvent =
  | Readonly<{
      kind: "actor-moved";
      actorId: string;
      goal: SquareCoord;
      pathCost: number;
      movementRemaining: number;
    }>
  | Readonly<{
      kind: "direct-attack-resolved";
      attackReference: string;
      attackerId: string;
      defenderId: string;
      critical: boolean;
      requestedDamage: number;
      appliedDamage: number;
      hpBefore: number;
      hpAfter: number;
      effectiveness: CombatEffectiveness;
    }>
  | Readonly<{
      kind: "direct-attack-missed";
      attackReference: string;
      attackerId: string;
      defenderId: string;
    }>
  | Readonly<{
      kind: "turn-ended";
      actorId: string;
      nextActorId: string;
      round: number;
    }>
  | Readonly<{
      kind: "encounter-ended";
      outcome: Exclude<EncounterOutcome, "ongoing">;
    }>;

export interface SerializedEncounterState {
  readonly rpg: SerializedActorRpgState;
  readonly battlefield: SerializedBattlefieldState;
  readonly turn: SerializedEncounterTurnState;
  readonly outcome: EncounterOutcome;
  readonly events: readonly SerializedEncounterEvent[];
}

function serializeEncounterEvent(event: EncounterEvent): SerializedEncounterEvent {
  switch (event.kind) {
    case "actor-moved":
      return {
        kind: event.kind,
        actorId: serializeActorId(event.actorId),
        goal: { ...event.goal },
        pathCost: event.pathCost,
        movementRemaining: event.movementRemaining,
      };
    case "direct-attack-resolved":
      return {
        ...event,
        attackerId: serializeActorId(event.attackerId),
        defenderId: serializeActorId(event.defenderId),
        effectiveness: { ...event.effectiveness },
      };
    case "direct-attack-missed":
      return {
        ...event,
        attackerId: serializeActorId(event.attackerId),
        defenderId: serializeActorId(event.defenderId),
      };
    case "turn-ended":
      return {
        ...event,
        actorId: serializeActorId(event.actorId),
        nextActorId: serializeActorId(event.nextActorId),
      };
    case "encounter-ended":
      return { ...event };
  }
}

export function serializeEncounterTurnState(state: EncounterTurnState): SerializedEncounterTurnState {
  return {
    round: state.round,
    pendingActorIds: state.pendingActorIds.map(serializeActorId),
    activeActorId: serializeActorId(state.activeActorId),
    movementRemaining: state.movementRemaining,
    mainActAvailable: state.mainActAvailable,
  };
}

export function serializeEncounterState(state: EncounterState): SerializedEncounterState {
  return {
    rpg: serializeActorRpgState(state.rpg),
    battlefield: serializeBattlefieldState(state.battlefield),
    turn: serializeEncounterTurnState(state.turn),
    outcome: state.outcome,
    events: state.events.map(serializeEncounterEvent),
  };
}

function participantIds(definition: EncounterDefinition): Set<string> {
  return new Set(definition.participants.map((participant) => serializeActorId(participant.actorId)));
}

function participantFor(definition: EncounterDefinition, actorId: ActorId) {
  return definition.participants.find((participant) => actorIdsEqual(participant.actorId, actorId));
}

function assertSafeNonNegativeInteger(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${field} must be a non-negative safe integer`);
  }
}

function assertFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${field} must be finite`);
}

function deserializeEncounterTurnState(
  serialized: SerializedEncounterTurnState,
  definition: EncounterDefinition,
): EncounterTurnState {
  if (!Number.isSafeInteger(serialized.round) || serialized.round < 1) {
    throw new RangeError("Serialized encounter round must be a positive safe integer");
  }
  if (serialized.pendingActorIds.length === 0) {
    throw new RangeError("Serialized encounter turn queue cannot be empty");
  }
  assertSafeNonNegativeInteger(serialized.movementRemaining, "Serialized movementRemaining");
  if (typeof serialized.mainActAvailable !== "boolean") {
    throw new RangeError("Serialized mainActAvailable must be boolean");
  }

  const knownParticipants = participantIds(definition);
  const seen = new Set<string>();
  for (const actorId of serialized.pendingActorIds) {
    if (!knownParticipants.has(actorId)) {
      throw new RangeError(`Serialized encounter queue references unknown actor: ${actorId}`);
    }
    if (seen.has(actorId)) {
      throw new RangeError(`Duplicate serialized encounter queue actor: ${actorId}`);
    }
    seen.add(actorId);
  }
  if (!knownParticipants.has(serialized.activeActorId)) {
    throw new RangeError(`Serialized encounter active actor is unknown: ${serialized.activeActorId}`);
  }
  if (serialized.pendingActorIds[0] !== serialized.activeActorId) {
    throw new RangeError("Serialized encounter active actor must be first in the pending queue");
  }

  const activeActorId = deserializeActorId(serialized.activeActorId);
  const active = participantFor(definition, activeActorId);
  if (active === undefined) throw new RangeError("Serialized encounter active actor is invalid");
  if (serialized.movementRemaining > active.movementAllowance) {
    throw new RangeError("Serialized encounter movement exceeds active actor allowance");
  }

  return {
    round: serialized.round,
    pendingActorIds: serialized.pendingActorIds.map(deserializeActorId),
    activeActorId,
    movementRemaining: serialized.movementRemaining,
    mainActAvailable: serialized.mainActAvailable,
  };
}

function assertKnownActor(actorId: string, knownActors: ReadonlySet<string>, field: string): ActorId {
  if (!knownActors.has(actorId)) {
    throw new RangeError(`${field} references unknown encounter actor: ${actorId}`);
  }
  return deserializeActorId(actorId);
}

function assertKnownAttack(reference: string, definition: EncounterDefinition): void {
  if (reference.length === 0 || definition.attacks[reference] === undefined) {
    throw new RangeError(`Serialized encounter event references unknown attack: ${reference}`);
  }
}

function validateEffectiveness(effectiveness: CombatEffectiveness): CombatEffectiveness {
  assertFiniteNumber(effectiveness.classMultiplier, "classMultiplier");
  assertFiniteNumber(effectiveness.damageCategoryMultiplier, "damageCategoryMultiplier");
  assertFiniteNumber(effectiveness.elementalMultiplier, "elementalMultiplier");
  assertFiniteNumber(effectiveness.combinedMultiplier, "combinedMultiplier");
  return { ...effectiveness };
}

function deserializeResolvedEvent(
  event: Extract<SerializedEncounterEvent, { kind: "direct-attack-resolved" }>,
  definition: EncounterDefinition,
  knownActors: ReadonlySet<string>,
): DirectAttackResolvedEvent {
  assertKnownAttack(event.attackReference, definition);
  if (typeof event.critical !== "boolean") throw new RangeError("Serialized critical must be boolean");
  assertSafeNonNegativeInteger(event.requestedDamage, "requestedDamage");
  assertSafeNonNegativeInteger(event.appliedDamage, "appliedDamage");
  assertSafeNonNegativeInteger(event.hpBefore, "hpBefore");
  assertSafeNonNegativeInteger(event.hpAfter, "hpAfter");
  if (event.hpAfter > event.hpBefore || event.appliedDamage > event.requestedDamage) {
    throw new RangeError("Serialized direct attack damage transition is inconsistent");
  }

  return {
    kind: event.kind,
    attackReference: event.attackReference,
    attackerId: assertKnownActor(event.attackerId, knownActors, "attackerId"),
    defenderId: assertKnownActor(event.defenderId, knownActors, "defenderId"),
    critical: event.critical,
    requestedDamage: event.requestedDamage,
    appliedDamage: event.appliedDamage,
    hpBefore: event.hpBefore,
    hpAfter: event.hpAfter,
    effectiveness: validateEffectiveness(event.effectiveness),
  };
}

function deserializeEncounterEvent(
  event: SerializedEncounterEvent,
  definition: EncounterDefinition,
  knownActors: ReadonlySet<string>,
): EncounterEvent {
  switch (event.kind) {
    case "actor-moved":
      assertSafeNonNegativeInteger(event.pathCost, "pathCost");
      assertSafeNonNegativeInteger(event.movementRemaining, "movementRemaining");
      if (!Number.isSafeInteger(event.goal.x) || !Number.isSafeInteger(event.goal.y)) {
        throw new RangeError("Serialized actor-moved goal must use safe integer coordinates");
      }
      return {
        kind: event.kind,
        actorId: assertKnownActor(event.actorId, knownActors, "actorId"),
        goal: { ...event.goal },
        pathCost: event.pathCost,
        movementRemaining: event.movementRemaining,
      };
    case "direct-attack-resolved":
      return deserializeResolvedEvent(event, definition, knownActors);
    case "direct-attack-missed":
      assertKnownAttack(event.attackReference, definition);
      return {
        kind: event.kind,
        attackReference: event.attackReference,
        attackerId: assertKnownActor(event.attackerId, knownActors, "attackerId"),
        defenderId: assertKnownActor(event.defenderId, knownActors, "defenderId"),
      };
    case "turn-ended":
      if (!Number.isSafeInteger(event.round) || event.round < 1) {
        throw new RangeError("Serialized turn-ended round must be positive");
      }
      return {
        kind: event.kind,
        actorId: assertKnownActor(event.actorId, knownActors, "actorId"),
        nextActorId: assertKnownActor(event.nextActorId, knownActors, "nextActorId"),
        round: event.round,
      };
    case "encounter-ended":
      if (
        event.outcome !== "player-victory" &&
        event.outcome !== "enemy-victory" &&
        event.outcome !== "draw"
      ) {
        throw new RangeError("Serialized encounter-ended outcome is invalid");
      }
      return { ...event };
  }
}

export function deserializeEncounterState(
  serialized: SerializedEncounterState,
  definition: EncounterDefinition,
  rpgDefinitions: readonly ActorRpgDefinition[],
): EncounterState {
  const rpg = deserializeActorRpgState(rpgDefinitions, serialized.rpg);
  const battlefield = deserializeBattlefieldState(serialized.battlefield);
  const turn = deserializeEncounterTurnState(serialized.turn, definition);
  const expectedOutcome = encounterOutcome(definition.participants, rpg);
  if (serialized.outcome !== expectedOutcome) {
    throw new RangeError(
      `Serialized encounter outcome ${serialized.outcome} does not match restored RPG state ${expectedOutcome}`,
    );
  }

  const knownActors = participantIds(definition);
  const events = serialized.events.map((event) =>
    deserializeEncounterEvent(event, definition, knownActors),
  );

  return {
    rpg,
    battlefield,
    turn,
    outcome: serialized.outcome,
    events,
  };
}
