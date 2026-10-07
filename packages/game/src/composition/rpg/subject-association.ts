import type { ActorId } from "../../actors/identity.js";

/**
 * Game-owned association between a Fantasia actor and one identity-free RPG state value.
 * ActorId is the RPG subject identity; RPG does not receive a duplicate entity ID.
 */
export interface ActorRpgSubject<TState> {
  readonly actorId: ActorId;
  readonly state: TState;
}

export function associateRpgSubject<TState>(actorId: ActorId, state: TState): ActorRpgSubject<TState> {
  return { actorId, state };
}
