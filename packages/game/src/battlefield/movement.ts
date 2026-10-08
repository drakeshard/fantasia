import { elevationAt } from "@drakeshard/tactical/elevation";
import type { LocationId, TacticalEntityId } from "@drakeshard/tactical/identity";
import { lowestCostPath } from "@drakeshard/tactical/pathfinding";
import {
  exclusiveOccupancyPolicy,
  locationsOf,
  occupantsAt,
  type PlacementRejected,
  placeEntity,
  relocateEntity,
} from "@drakeshard/tactical/placement";
import { reachableLocations } from "@drakeshard/tactical/reachability";
import {
  parseSquareLocationId,
  type SquareCoord,
  squareLocationId,
} from "@drakeshard/tactical/square";
import type { TraversalPolicy } from "@drakeshard/tactical/traversal";
import type { ActorId } from "../actors/identity.js";
import {
  type ActorIdentityState,
  tacticalEntityForActor,
} from "../composition/tactical/actor-identity.js";
import { type BattlefieldState, battlefieldTopology } from "./state.js";

export interface GroundTraversalRules {
  readonly moveCost: number;
  readonly maxClimb: number;
  readonly maxDrop: number;
}

export type BattlefieldActorRejection =
  | { readonly kind: "actor-not-mapped"; readonly actorId: ActorId }
  | { readonly kind: "actor-not-placed"; readonly actorId: ActorId };

export type PlaceActorResult =
  | { readonly kind: "placed"; readonly state: BattlefieldState }
  | {
      readonly kind: "rejected";
      readonly reason:
        | BattlefieldActorRejection
        | { readonly kind: "blocked-location"; readonly coord: SquareCoord }
        | PlacementRejected;
    };

export interface ReachableBattlefieldLocation {
  readonly coord: SquareCoord;
  readonly cost: number;
}

export type ReachableActorLocationsResult =
  | {
      readonly kind: "reachable";
      readonly locations: readonly ReachableBattlefieldLocation[];
    }
  | {
      readonly kind: "rejected";
      readonly reason:
        | BattlefieldActorRejection
        | { readonly kind: "invalid-traversal-rules" }
        | { readonly kind: "invalid-budget"; readonly budget: number }
        | { readonly kind: "invalid-transition-cost" };
    };

export interface BattlefieldPath {
  readonly coords: readonly SquareCoord[];
  readonly cost: number;
}

export type ActorPathRejection =
  | BattlefieldActorRejection
  | { readonly kind: "invalid-traversal-rules" }
  | { readonly kind: "unknown-destination"; readonly coord: SquareCoord }
  | { readonly kind: "unreachable"; readonly coord: SquareCoord }
  | { readonly kind: "invalid-transition-cost" };

export type ActorPathResult =
  | { readonly kind: "path"; readonly path: BattlefieldPath }
  | { readonly kind: "rejected"; readonly reason: ActorPathRejection };

export type MoveActorResult =
  | {
      readonly kind: "moved";
      readonly state: BattlefieldState;
      readonly path: BattlefieldPath;
    }
  | { readonly kind: "rejected"; readonly reason: ActorPathRejection };

function validRules(rules: GroundTraversalRules): boolean {
  return (
    Number.isFinite(rules.moveCost) &&
    rules.moveCost >= 0 &&
    Number.isSafeInteger(rules.maxClimb) &&
    rules.maxClimb >= 0 &&
    Number.isSafeInteger(rules.maxDrop) &&
    rules.maxDrop >= 0
  );
}

function resolveActorEntity(
  identities: ActorIdentityState,
  actorId: ActorId,
): TacticalEntityId | BattlefieldActorRejection {
  const entity = tacticalEntityForActor(identities, actorId);
  return entity ?? { kind: "actor-not-mapped", actorId };
}

function isActorRejection(
  value: TacticalEntityId | BattlefieldActorRejection,
): value is BattlefieldActorRejection {
  return typeof value !== "string";
}

function coordForLocation(location: LocationId): SquareCoord {
  const coord = parseSquareLocationId(location);
  if (coord === undefined) {
    throw new Error(`Expected square battlefield location: ${location}`);
  }
  return coord;
}

function battlefieldTraversalPolicy(
  state: BattlefieldState,
  entity: TacticalEntityId,
  rules: GroundTraversalRules,
): TraversalPolicy {
  const blocked = new Set(state.blockedLocations);

  return (from, to) => {
    if (blocked.has(to)) return undefined;
    if (occupantsAt(state.placement, to).some((occupant) => occupant !== entity)) return undefined;

    const fromLevel = elevationAt(state.elevation, from) ?? 0;
    const toLevel = elevationAt(state.elevation, to) ?? 0;
    const difference = toLevel - fromLevel;
    if (difference > rules.maxClimb || difference < -rules.maxDrop) return undefined;

    return rules.moveCost;
  };
}

export function placeActorOnBattlefield(
  state: BattlefieldState,
  identities: ActorIdentityState,
  actorId: ActorId,
  coord: SquareCoord,
): PlaceActorResult {
  const entity = resolveActorEntity(identities, actorId);
  if (isActorRejection(entity)) return { kind: "rejected", reason: entity };

  const location = squareLocationId(coord);
  if (state.blockedLocations.includes(location)) {
    return { kind: "rejected", reason: { kind: "blocked-location", coord } };
  }

  const topology = battlefieldTopology(state.bounds);
  const result = placeEntity(
    state.placement,
    topology,
    entity,
    [location],
    [exclusiveOccupancyPolicy],
  );
  if (result.kind !== "placed") return { kind: "rejected", reason: result.reason };

  return {
    kind: "placed",
    state: { ...state, placement: result.state },
  };
}

export function reachableActorGroundLocations(
  state: BattlefieldState,
  identities: ActorIdentityState,
  actorId: ActorId,
  budget: number,
  rules: GroundTraversalRules,
): ReachableActorLocationsResult {
  if (!validRules(rules)) {
    return { kind: "rejected", reason: { kind: "invalid-traversal-rules" } };
  }

  const entity = resolveActorEntity(identities, actorId);
  if (isActorRejection(entity)) return { kind: "rejected", reason: entity };
  const start = locationsOf(state.placement, entity)?.[0];
  if (start === undefined) {
    return { kind: "rejected", reason: { kind: "actor-not-placed", actorId } };
  }

  const result = reachableLocations(
    battlefieldTopology(state.bounds),
    start,
    budget,
    battlefieldTraversalPolicy(state, entity, rules),
  );
  if (result.kind === "invalid-budget") {
    return { kind: "rejected", reason: { kind: "invalid-budget", budget: result.budget } };
  }
  if (result.kind === "invalid-transition-cost") {
    return { kind: "rejected", reason: { kind: "invalid-transition-cost" } };
  }
  if (result.kind === "unknown-location") {
    return { kind: "rejected", reason: { kind: "actor-not-placed", actorId } };
  }

  return {
    kind: "reachable",
    locations: result.locations.map((entry) => ({
      coord: coordForLocation(entry.location),
      cost: entry.cost,
    })),
  };
}

export function findActorGroundPath(
  state: BattlefieldState,
  identities: ActorIdentityState,
  actorId: ActorId,
  goal: SquareCoord,
  rules: GroundTraversalRules,
): ActorPathResult {
  if (!validRules(rules)) {
    return { kind: "rejected", reason: { kind: "invalid-traversal-rules" } };
  }

  const entity = resolveActorEntity(identities, actorId);
  if (isActorRejection(entity)) return { kind: "rejected", reason: entity };
  const start = locationsOf(state.placement, entity)?.[0];
  if (start === undefined) {
    return { kind: "rejected", reason: { kind: "actor-not-placed", actorId } };
  }

  const topology = battlefieldTopology(state.bounds);
  const destination = squareLocationId(goal);
  if (!topology.hasLocation(destination)) {
    return { kind: "rejected", reason: { kind: "unknown-destination", coord: goal } };
  }

  const result = lowestCostPath(
    topology,
    start,
    destination,
    battlefieldTraversalPolicy(state, entity, rules),
  );
  if (result.kind === "unreachable") {
    return { kind: "rejected", reason: { kind: "unreachable", coord: goal } };
  }
  if (result.kind === "invalid-transition-cost") {
    return { kind: "rejected", reason: { kind: "invalid-transition-cost" } };
  }
  if (result.kind === "unknown-location") {
    return { kind: "rejected", reason: { kind: "unknown-destination", coord: goal } };
  }

  return {
    kind: "path",
    path: {
      coords: result.path.locations.map(coordForLocation),
      cost: result.path.cost,
    },
  };
}

export function moveActorOnBattlefield(
  state: BattlefieldState,
  identities: ActorIdentityState,
  actorId: ActorId,
  goal: SquareCoord,
  rules: GroundTraversalRules,
): MoveActorResult {
  const path = findActorGroundPath(state, identities, actorId, goal, rules);
  if (path.kind === "rejected") return path;

  const entity = resolveActorEntity(identities, actorId);
  if (isActorRejection(entity)) return { kind: "rejected", reason: entity };

  const result = relocateEntity(
    state.placement,
    battlefieldTopology(state.bounds),
    entity,
    [squareLocationId(goal)],
    [exclusiveOccupancyPolicy],
  );
  if (result.kind !== "relocated") {
    return { kind: "rejected", reason: { kind: "unreachable", coord: goal } };
  }

  return {
    kind: "moved",
    state: { ...state, placement: result.state },
    path: path.path,
  };
}
