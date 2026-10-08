import { elevationAt } from "@drakeshard/tactical/elevation";
import { occupantsAt } from "@drakeshard/tactical/placement";
import { squareLocationId, type SquareCoord } from "@drakeshard/tactical/square";
import type { ActorId } from "../actors/identity.js";
import {
  actorForTacticalEntity,
  type ActorIdentityState,
} from "../composition/tactical/actor-identity.js";
import type { BattlefieldState } from "./state.js";

export interface BattlefieldCellReadModel {
  readonly coord: SquareCoord;
  readonly elevation: number;
  readonly blocked: boolean;
  readonly actorId?: ActorId;
}

export interface BattlefieldReadModel {
  readonly bounds: BattlefieldState["bounds"];
  readonly cells: readonly BattlefieldCellReadModel[];
}

export function battlefieldReadModel(
  state: BattlefieldState,
  identities: ActorIdentityState,
): BattlefieldReadModel {
  const cells: BattlefieldCellReadModel[] = [];

  for (let y = state.bounds.minY; y <= state.bounds.maxY; y += 1) {
    for (let x = state.bounds.minX; x <= state.bounds.maxX; x += 1) {
      const coord = { x, y };
      const location = squareLocationId(coord);
      const occupant = occupantsAt(state.placement, location)[0];
      const actorId = occupant === undefined ? undefined : actorForTacticalEntity(identities, occupant);

      cells.push({
        coord,
        elevation: elevationAt(state.elevation, location) ?? 0,
        blocked: state.blockedLocations.includes(location),
        ...(actorId === undefined ? {} : { actorId }),
      });
    }
  }

  return {
    bounds: { ...state.bounds },
    cells,
  };
}
