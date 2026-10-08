import {
  type ElevationState,
  emptyElevationState,
  setElevation,
} from "@drakeshard/tactical/elevation";
import {
  deserializeLocationId,
  deserializeTacticalEntityId,
  type LocationId,
  serializeLocationId,
  serializeTacticalEntityId,
} from "@drakeshard/tactical/identity";
import {
  emptyPlacementState,
  exclusiveOccupancyPolicy,
  type PlacementState,
  placeEntity,
} from "@drakeshard/tactical/placement";
import {
  createSquareTopology,
  type SquareBounds,
  type SquareCoord,
  squareLocationId,
} from "@drakeshard/tactical/square";
import type { Topology } from "@drakeshard/tactical/topology";

export interface BattlefieldState {
  readonly bounds: SquareBounds;
  readonly blockedLocations: readonly LocationId[];
  readonly placement: PlacementState;
  readonly elevation: ElevationState;
}

export interface BattlefieldElevationInput {
  readonly coord: SquareCoord;
  readonly level: number;
}

export interface SerializedBattlefieldPlacement {
  readonly entity: string;
  readonly locations: readonly string[];
}

export interface SerializedBattlefieldElevation {
  readonly location: string;
  readonly level: number;
}

export interface SerializedBattlefieldState {
  readonly bounds: SquareBounds;
  readonly blockedLocations: readonly string[];
  readonly placements: readonly SerializedBattlefieldPlacement[];
  readonly elevations: readonly SerializedBattlefieldElevation[];
}

export function battlefieldTopology(bounds: SquareBounds): Topology {
  const topology = createSquareTopology({ bounds, adjacency: "four" });
  if (topology === undefined) {
    throw new RangeError("Invalid Fantasia battlefield bounds");
  }
  return topology;
}

function validateBlockedLocations(topology: Topology, locations: readonly LocationId[]): void {
  const seen = new Set<string>();
  for (const location of locations) {
    const serialized = serializeLocationId(location);
    if (seen.has(serialized)) {
      throw new RangeError(`Duplicate blocked battlefield location: ${serialized}`);
    }
    if (!topology.hasLocation(location)) {
      throw new RangeError(`Blocked battlefield location is outside topology: ${serialized}`);
    }
    seen.add(serialized);
  }
}

export function createBattlefieldState(
  bounds: SquareBounds,
  blockedCoords: readonly SquareCoord[] = [],
  elevations: readonly BattlefieldElevationInput[] = [],
): BattlefieldState {
  const topology = battlefieldTopology(bounds);
  const blockedLocations = blockedCoords.map(squareLocationId);
  validateBlockedLocations(topology, blockedLocations);

  let elevation = emptyElevationState();
  for (const entry of elevations) {
    const result = setElevation(elevation, topology, squareLocationId(entry.coord), entry.level);
    if (result.kind === "rejected") {
      throw new RangeError(`Invalid battlefield elevation: ${result.reason.kind}`);
    }
    elevation = result.state;
  }

  return {
    bounds: { ...bounds },
    blockedLocations,
    placement: emptyPlacementState(),
    elevation,
  };
}

export function serializeBattlefieldState(state: BattlefieldState): SerializedBattlefieldState {
  return {
    bounds: { ...state.bounds },
    blockedLocations: state.blockedLocations.map(serializeLocationId),
    placements: state.placement.placements.map((placement) => ({
      entity: serializeTacticalEntityId(placement.entity),
      locations: placement.locations.map(serializeLocationId),
    })),
    elevations: state.elevation.entries.map((entry) => ({
      location: serializeLocationId(entry.location),
      level: entry.level,
    })),
  };
}

export function deserializeBattlefieldState(
  serialized: SerializedBattlefieldState,
): BattlefieldState {
  const topology = battlefieldTopology(serialized.bounds);
  const blockedLocations = serialized.blockedLocations.map(deserializeLocationId);
  validateBlockedLocations(topology, blockedLocations);

  let placement = emptyPlacementState();
  for (const entry of serialized.placements) {
    const locations = entry.locations.map(deserializeLocationId);
    if (locations.some((location) => blockedLocations.includes(location))) {
      throw new RangeError("Serialized battlefield placement occupies blocked structure");
    }

    const result = placeEntity(
      placement,
      topology,
      deserializeTacticalEntityId(entry.entity),
      locations,
      [exclusiveOccupancyPolicy],
    );
    if (result.kind === "rejected") {
      throw new RangeError(`Invalid serialized battlefield placement: ${result.reason.kind}`);
    }
    if (result.kind !== "placed") {
      throw new Error(`Unexpected Tactical placement result: ${result.kind}`);
    }
    placement = result.state;
  }

  let elevation = emptyElevationState();
  for (const entry of serialized.elevations) {
    const result = setElevation(
      elevation,
      topology,
      deserializeLocationId(entry.location),
      entry.level,
    );
    if (result.kind === "rejected") {
      throw new RangeError(`Invalid serialized battlefield elevation: ${result.reason.kind}`);
    }
    elevation = result.state;
  }

  return {
    bounds: { ...serialized.bounds },
    blockedLocations,
    placement,
    elevation,
  };
}
