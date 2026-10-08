import type { SquareCoord } from "@drakeshard/tactical/square";
import type { ActorId } from "../actors/identity.js";
import { actorIdsEqual, serializeActorId } from "../actors/identity.js";
import {
  findActorGroundPath,
  type GroundTraversalRules,
  moveActorOnBattlefield,
} from "../battlefield/movement.js";
import type { BattlefieldState } from "../battlefield/state.js";
import {
  type AttackResolutionRolls,
  type CombatParticipant,
  type DamagePolicy,
  type DirectAttackDefinition,
  type DirectAttackResolvedEvent,
  resolveDirectAttack,
} from "../combat/foundation.js";
import { type ActorRpgState, actorRpgProfile } from "../composition/rpg/actor-state.js";
import type { ActorIdentityState } from "../composition/tactical/actor-identity.js";
import {
  advanceEncounterTurnState,
  consumeEncounterMainAct,
  createEncounterTurnState,
  type EncounterTurnParticipant,
  type EncounterTurnState,
  spendEncounterMovement,
} from "./turns.js";

export type EncounterOutcome = "ongoing" | "player-victory" | "enemy-victory" | "draw";

export interface EncounterDefinition {
  readonly participants: readonly EncounterTurnParticipant[];
  readonly traversalRules: GroundTraversalRules;
  readonly attacks: Readonly<Record<string, DirectAttackDefinition>>;
}

export interface EncounterState {
  readonly rpg: ActorRpgState;
  readonly battlefield: BattlefieldState;
  readonly turn: EncounterTurnState;
  readonly outcome: EncounterOutcome;
  readonly events: readonly EncounterEvent[];
}

export type EncounterEvent =
  | Readonly<{
      kind: "actor-moved";
      actorId: ActorId;
      goal: SquareCoord;
      pathCost: number;
      movementRemaining: number;
    }>
  | DirectAttackResolvedEvent
  | Readonly<{
      kind: "direct-attack-missed";
      attackReference: string;
      attackerId: ActorId;
      defenderId: ActorId;
    }>
  | Readonly<{
      kind: "turn-ended";
      actorId: ActorId;
      nextActorId: ActorId;
      round: number;
    }>
  | Readonly<{
      kind: "encounter-ended";
      outcome: Exclude<EncounterOutcome, "ongoing">;
    }>;

export type EncounterCommand =
  | Readonly<{
      kind: "move";
      actorId: ActorId;
      goal: SquareCoord;
    }>
  | Readonly<{
      kind: "direct-attack";
      actorId: ActorId;
      defenderId: ActorId;
      attackReference: string;
      rolls: AttackResolutionRolls;
    }>
  | Readonly<{
      kind: "end-turn";
      actorId: ActorId;
    }>;

export type EncounterCommandRejection =
  | "encounter-ended"
  | "not-active-actor"
  | "unknown-actor"
  | "unreachable"
  | "main-act-spent"
  | "unknown-attack"
  | "attack-rejected";

export type EncounterCommandResult =
  | Readonly<{ kind: "applied"; state: EncounterState }>
  | Readonly<{ kind: "rejected"; state: EncounterState; reason: EncounterCommandRejection }>;

function participantFor(
  participants: readonly EncounterTurnParticipant[],
  actorId: ActorId,
): EncounterTurnParticipant | undefined {
  return participants.find((participant) => actorIdsEqual(participant.actorId, actorId));
}

function livingSideCount(
  participants: readonly EncounterTurnParticipant[],
  rpg: ActorRpgState,
  side: EncounterTurnParticipant["side"],
): number {
  return participants.filter((participant) => {
    if (participant.side !== side) return false;
    const profile = actorRpgProfile(rpg, participant.actorId);
    return profile !== undefined && profile.hp.current > 0;
  }).length;
}

export function encounterOutcome(
  participants: readonly EncounterTurnParticipant[],
  rpg: ActorRpgState,
): EncounterOutcome {
  const players = livingSideCount(participants, rpg, "player");
  const enemies = livingSideCount(participants, rpg, "enemy");
  if (players === 0 && enemies === 0) return "draw";
  if (enemies === 0) return "player-victory";
  if (players === 0) return "enemy-victory";
  return "ongoing";
}

function validateDefinition(definition: EncounterDefinition, rpg: ActorRpgState): void {
  const players = definition.participants.filter((participant) => participant.side === "player");
  const enemies = definition.participants.filter((participant) => participant.side === "enemy");
  if (players.length === 0 || enemies.length === 0) {
    throw new RangeError("Encounter requires at least one participant on each side");
  }

  for (const participant of definition.participants) {
    if (actorRpgProfile(rpg, participant.actorId) === undefined) {
      throw new RangeError(
        `Missing RPG state for encounter actor: ${serializeActorId(participant.actorId)}`,
      );
    }
  }
}

export function createEncounterState(
  definition: EncounterDefinition,
  rpg: ActorRpgState,
  battlefield: BattlefieldState,
): EncounterState {
  validateDefinition(definition, rpg);
  const outcome = encounterOutcome(definition.participants, rpg);
  if (outcome !== "ongoing") {
    throw new RangeError("Encounter must start with at least one living actor on each side");
  }

  return {
    rpg,
    battlefield,
    turn: createEncounterTurnState(definition.participants, rpg),
    outcome,
    events: [],
  };
}

function withOutcome(
  state: EncounterState,
  participants: readonly EncounterTurnParticipant[],
): EncounterState {
  const outcome = encounterOutcome(participants, state.rpg);
  if (outcome === state.outcome) return state;
  if (outcome === "ongoing") return { ...state, outcome };
  return {
    ...state,
    outcome,
    events: [...state.events, { kind: "encounter-ended", outcome }],
  };
}

function applyMove(
  state: EncounterState,
  definition: EncounterDefinition,
  identities: ActorIdentityState,
  command: Extract<EncounterCommand, { kind: "move" }>,
): EncounterCommandResult {
  const participant = participantFor(definition.participants, command.actorId);
  if (participant === undefined) return { kind: "rejected", state, reason: "unknown-actor" };

  const path = findActorGroundPath(
    state.battlefield,
    identities,
    command.actorId,
    command.goal,
    definition.traversalRules,
  );
  if (path.kind !== "path" || path.path.cost > state.turn.movementRemaining) {
    return { kind: "rejected", state, reason: "unreachable" };
  }

  const moved = moveActorOnBattlefield(
    state.battlefield,
    identities,
    command.actorId,
    command.goal,
    definition.traversalRules,
  );
  if (moved.kind !== "moved") return { kind: "rejected", state, reason: "unreachable" };

  const turn = spendEncounterMovement(state.turn, moved.path.cost);
  if (turn === undefined) return { kind: "rejected", state, reason: "unreachable" };

  return {
    kind: "applied",
    state: {
      ...state,
      battlefield: moved.state,
      turn,
      events: [
        ...state.events,
        {
          kind: "actor-moved",
          actorId: command.actorId,
          goal: { ...command.goal },
          pathCost: moved.path.cost,
          movementRemaining: turn.movementRemaining,
        },
      ],
    },
  };
}

function applyAttack(
  state: EncounterState,
  definition: EncounterDefinition,
  identities: ActorIdentityState,
  damagePolicy: DamagePolicy,
  command: Extract<EncounterCommand, { kind: "direct-attack" }>,
): EncounterCommandResult {
  if (!state.turn.mainActAvailable) {
    return { kind: "rejected", state, reason: "main-act-spent" };
  }
  const attack = definition.attacks[command.attackReference];
  if (attack === undefined) return { kind: "rejected", state, reason: "unknown-attack" };

  const participants: readonly CombatParticipant[] = definition.participants.map((participant) => ({
    actorId: participant.actorId,
    side: participant.side,
  }));
  const outcome = resolveDirectAttack({
    definition: attack,
    attackerId: command.actorId,
    defenderId: command.defenderId,
    participants,
    rpg: state.rpg,
    battlefield: state.battlefield,
    identities,
    rolls: command.rolls,
    damagePolicy,
  });
  if (outcome.kind === "rejected") {
    return { kind: "rejected", state, reason: "attack-rejected" };
  }

  const turn = consumeEncounterMainAct(state.turn);
  if (outcome.kind === "missed") {
    return {
      kind: "applied",
      state: {
        ...state,
        turn,
        events: [
          ...state.events,
          {
            kind: "direct-attack-missed",
            attackReference: outcome.attackReference,
            attackerId: outcome.attackerId,
            defenderId: outcome.defenderId,
          },
        ],
      },
    };
  }

  return {
    kind: "applied",
    state: withOutcome(
      {
        ...state,
        rpg: outcome.rpg,
        turn,
        events: [...state.events, outcome.event],
      },
      definition.participants,
    ),
  };
}

function applyEndTurn(
  state: EncounterState,
  definition: EncounterDefinition,
  command: Extract<EncounterCommand, { kind: "end-turn" }>,
): EncounterCommandResult {
  const turn = advanceEncounterTurnState(state.turn, definition.participants, state.rpg);
  return {
    kind: "applied",
    state: {
      ...state,
      turn,
      events: [
        ...state.events,
        {
          kind: "turn-ended",
          actorId: command.actorId,
          nextActorId: turn.activeActorId,
          round: turn.round,
        },
      ],
    },
  };
}

export function applyEncounterCommand(
  state: EncounterState,
  definition: EncounterDefinition,
  identities: ActorIdentityState,
  damagePolicy: DamagePolicy,
  command: EncounterCommand,
): EncounterCommandResult {
  if (state.outcome !== "ongoing") {
    return { kind: "rejected", state, reason: "encounter-ended" };
  }
  if (!actorIdsEqual(command.actorId, state.turn.activeActorId)) {
    return { kind: "rejected", state, reason: "not-active-actor" };
  }

  if (command.kind === "move") {
    return applyMove(state, definition, identities, command);
  }
  if (command.kind === "direct-attack") {
    return applyAttack(state, definition, identities, damagePolicy, command);
  }
  return applyEndTurn(state, definition, command);
}
