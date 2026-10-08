import type { ActorId } from "../actors/identity.js";
import { actorIdsEqual, serializeActorId } from "../actors/identity.js";
import type { CombatSide } from "../combat/foundation.js";
import { type ActorRpgState, actorRpgProfile } from "../composition/rpg/actor-state.js";

export interface EncounterTurnParticipant {
  readonly actorId: ActorId;
  readonly side: CombatSide;
  readonly sameSideTiePriority: number;
  readonly movementAllowance: number;
}

export interface EncounterTurnState {
  readonly round: number;
  readonly pendingActorIds: readonly ActorId[];
  readonly activeActorId: ActorId;
  readonly movementRemaining: number;
  readonly mainActAvailable: boolean;
}

interface RankedParticipant extends EncounterTurnParticipant {
  readonly speed: number;
}

function validateParticipants(
  participants: readonly EncounterTurnParticipant[],
  rpg: ActorRpgState,
): readonly RankedParticipant[] {
  if (participants.length === 0) {
    throw new RangeError("Encounter requires at least one participant");
  }

  const seen = new Set<string>();
  const ranked = participants.map((participant) => {
    const id = serializeActorId(participant.actorId);
    if (seen.has(id)) throw new RangeError(`Duplicate encounter ActorId: ${id}`);
    seen.add(id);

    if (!Number.isSafeInteger(participant.sameSideTiePriority)) {
      throw new RangeError(`Invalid same-side tie priority for actor: ${id}`);
    }
    if (!Number.isSafeInteger(participant.movementAllowance) || participant.movementAllowance < 0) {
      throw new RangeError(`Invalid movement allowance for actor: ${id}`);
    }

    const profile = actorRpgProfile(rpg, participant.actorId);
    if (profile === undefined)
      throw new RangeError(`Missing RPG profile for encounter actor: ${id}`);
    return { ...participant, speed: profile.attributes.speed };
  });

  for (let index = 0; index < ranked.length; index += 1) {
    const left = ranked[index];
    if (left === undefined) continue;
    for (let rightIndex = index + 1; rightIndex < ranked.length; rightIndex += 1) {
      const right = ranked[rightIndex];
      if (right === undefined) continue;
      if (
        left.side === right.side &&
        left.speed === right.speed &&
        left.sameSideTiePriority === right.sameSideTiePriority
      ) {
        throw new RangeError(
          `Ambiguous same-side Speed tie: ${serializeActorId(left.actorId)} / ${serializeActorId(right.actorId)}`,
        );
      }
    }
  }

  return ranked;
}

function livingParticipants(
  participants: readonly EncounterTurnParticipant[],
  rpg: ActorRpgState,
): readonly EncounterTurnParticipant[] {
  return participants.filter((participant) => {
    const profile = actorRpgProfile(rpg, participant.actorId);
    return profile !== undefined && profile.hp.current > 0;
  });
}

function rankedActorIds(
  participants: readonly EncounterTurnParticipant[],
  rpg: ActorRpgState,
): readonly ActorId[] {
  return [...validateParticipants(participants, rpg)]
    .sort((left, right) => {
      if (left.speed !== right.speed) return right.speed - left.speed;
      if (left.side !== right.side) return left.side === "player" ? -1 : 1;
      return left.sameSideTiePriority - right.sameSideTiePriority;
    })
    .map((participant) => participant.actorId);
}

function participantFor(
  participants: readonly EncounterTurnParticipant[],
  actorId: ActorId,
): EncounterTurnParticipant | undefined {
  return participants.find((participant) => actorIdsEqual(participant.actorId, actorId));
}

function activeTurn(
  round: number,
  queue: readonly ActorId[],
  participants: readonly EncounterTurnParticipant[],
): EncounterTurnState {
  const activeActorId = queue[0];
  if (activeActorId === undefined) throw new RangeError("Encounter turn queue cannot be empty");
  const active = participantFor(participants, activeActorId);
  if (active === undefined) throw new Error("Encounter queue references unknown participant");

  return {
    round,
    pendingActorIds: queue,
    activeActorId,
    movementRemaining: active.movementAllowance,
    mainActAvailable: true,
  };
}

export function createEncounterTurnState(
  participants: readonly EncounterTurnParticipant[],
  rpg: ActorRpgState,
): EncounterTurnState {
  const living = livingParticipants(participants, rpg);
  if (living.length === 0)
    throw new RangeError("Encounter requires at least one living participant");
  return activeTurn(1, rankedActorIds(living, rpg), participants);
}

export function advanceEncounterTurnState(
  state: EncounterTurnState,
  participants: readonly EncounterTurnParticipant[],
  rpg: ActorRpgState,
): EncounterTurnState {
  const living = livingParticipants(participants, rpg);
  if (living.length === 0) throw new RangeError("Encounter has no living participants to advance");

  const remaining = state.pendingActorIds
    .slice(1)
    .filter((actorId) => living.some((participant) => actorIdsEqual(participant.actorId, actorId)));
  if (remaining.length > 0) {
    return activeTurn(state.round, remaining, participants);
  }

  return activeTurn(state.round + 1, rankedActorIds(living, rpg), participants);
}

export function spendEncounterMovement(
  state: EncounterTurnState,
  amount: number,
): EncounterTurnState | undefined {
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > state.movementRemaining) {
    return undefined;
  }
  if (amount === 0) return state;
  return { ...state, movementRemaining: state.movementRemaining - amount };
}

export function consumeEncounterMainAct(state: EncounterTurnState): EncounterTurnState {
  if (!state.mainActAvailable) return state;
  return { ...state, mainActAvailable: false };
}
