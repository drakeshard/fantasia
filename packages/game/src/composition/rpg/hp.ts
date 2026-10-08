import { decreaseResource } from "@drakeshard/rpg/resources";
import type { ActorId } from "../../actors/identity.js";
import { actorIdsEqual } from "../../actors/identity.js";
import { type ActorRpgState, HP_RESOURCE_REFERENCE } from "./actor-state.js";

export type ActorHpDamageOutcome =
  | Readonly<{
      kind: "changed" | "unchanged";
      state: ActorRpgState;
      previousCurrent: number;
      current: number;
      applied: number;
    }>
  | Readonly<{
      kind: "rejected";
      reason: "unknown-actor" | "invalid-amount";
      state: ActorRpgState;
    }>;

export function damageActorHp(
  state: ActorRpgState,
  actorId: ActorId,
  amount: number,
): ActorHpDamageOutcome {
  if (!Number.isFinite(amount) || amount < 0) {
    return { kind: "rejected", reason: "invalid-amount", state };
  }

  const subject = state.actors.find((entry) => actorIdsEqual(entry.actorId, actorId));
  if (subject === undefined) {
    return { kind: "rejected", reason: "unknown-actor", state };
  }

  const previousCurrent = subject.hp.current;
  const transition = decreaseResource(
    {
      reference: HP_RESOURCE_REFERENCE,
      initialCurrent: subject.hp.current,
      initialCapacity: subject.hp.capacity,
    },
    subject.hp,
    amount,
  );
  if (transition.kind === "rejected") {
    return { kind: "rejected", reason: "invalid-amount", state };
  }

  if (transition.kind === "unchanged") {
    return {
      kind: "unchanged",
      state,
      previousCurrent,
      current: previousCurrent,
      applied: 0,
    };
  }

  const nextActors = state.actors.map((entry) =>
    actorIdsEqual(entry.actorId, actorId) ? { ...entry, hp: transition.state } : entry,
  );
  return {
    kind: "changed",
    state: { actors: nextActors },
    previousCurrent,
    current: transition.state.current,
    applied: previousCurrent - transition.state.current,
  };
}
