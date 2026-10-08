import type { ActorId } from "../actors/identity.js";
import { serializeActorId } from "../actors/identity.js";
import { actorRpgProfile, type ActorRpgState } from "../composition/rpg/actor-state.js";
import type { CombatSide } from "../combat/foundation.js";

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
    if (profile === undefined) throw new RangeError(`Missing RPG profile for encounter actor: ${id}`);
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

export function createEncounterTurnState(
  participants: readonly EncounterTurnParticipant[],
  rpg: ActorRpgState,
): EncounterTurnState {
  const ranked = [...validateParticipants(participants, rpg)].sort((left, right) => {
    if (left.speed !== right.speed) return right.speed - left.speed;
    if (left.side !== right.side) return left.side === "player" ? -1 : 1;
    return left.sameSideTiePriority - right.sameSideTiePriority;
  });

  const active = ranked[0];
  if (active === undefined) throw new Error("Validated encounter unexpectedly has no active actor");

  return {
    round: 1,
    pendingActorIds: ranked.map((participant) => participant.actorId),
    activeActorId: active.actorId,
    movementRemaining: active.movementAllowance,
    mainActAvailable: true,
  };
}

export function consumeEncounterMainAct(state: EncounterTurnState): EncounterTurnState {
  if (!state.mainActAvailable) return state;
  return { ...state, mainActAvailable: false };
}
