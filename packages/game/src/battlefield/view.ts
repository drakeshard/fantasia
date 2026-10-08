import { elevationAt } from "@drakeshard/tactical/elevation";
import { occupantsAt } from "@drakeshard/tactical/placement";
import { type SquareCoord, squareLocationId } from "@drakeshard/tactical/square";
import type { ActorId } from "../actors/identity.js";
import { actorForTacticalEntity, type ActorIdentityState } from "../composition/tactical/actor-identity.js";
import type { BattlefieldState } from "./state.js";

export interface BattlefieldCellFacts {
  readonly coord: SquareCoord;
  readonly blocked: boolean;
  readonly elevation: number;
  readonly actorId?: ActorId;
}

/** Renderer-neutral projection of authoritative battlefield facts for one square. */
export function battlefieldCellFacts(
  state: BattlefieldState,
  identities: ActorIdentityState,
  coord: SquareCoord,
): BattlefieldCellFacts {
  const location = squareLocationId(coord);
  const occupant = occupantsAt(state.placement, location)[0];
  const actorId = occupant === undefined ? undefined : actorForTacticalEntity(identities, occupant);

  return {
    coord: { ...coord },
    blocked: state.blockedLocations.includes(location),
    elevation: elevationAt(state.elevation, location) ?? 0,
    ...(actorId === undefined ? {} : { actorId }),
  };
}
