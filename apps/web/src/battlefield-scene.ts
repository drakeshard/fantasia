import type {
  BattlefieldBounds,
  BattlefieldCellCoord,
  BattlefieldPropVisualId,
  BattlefieldTerrainVisualId,
  BattlefieldUnitVisualId,
} from "./battlefield-presentation.js";

export interface BattlefieldElevationCell extends BattlefieldCellCoord {
  readonly level: number;
}

export interface BattlefieldTerrainRegion {
  readonly visualId: BattlefieldTerrainVisualId;
  readonly cells: readonly BattlefieldCellCoord[];
}

export interface BattlefieldUnitMarker {
  readonly cell: BattlefieldCellCoord;
  readonly visualId: BattlefieldUnitVisualId;
  readonly label: string;
}

export interface BattlefieldRenderScene {
  readonly id: string;
  readonly bounds: BattlefieldBounds;
  readonly blockedCells: readonly BattlefieldCellCoord[];
  readonly elevationCells: readonly BattlefieldElevationCell[];
  readonly terrainRegions: readonly BattlefieldTerrainRegion[];
  readonly blockedPropVisualId: BattlefieldPropVisualId;
  readonly routeAnchors: readonly BattlefieldCellCoord[];
  readonly routeClearanceCells: readonly BattlefieldCellCoord[];
  readonly exitZone: readonly BattlefieldCellCoord[];
  readonly units: readonly BattlefieldUnitMarker[];
  readonly cartStart?: BattlefieldCellCoord;
  readonly testIdPrefix: string;
  readonly ariaLabel: string;
}

export function battlefieldUnitVisualId(
  side: string,
  reinforcement: boolean,
): BattlefieldUnitVisualId {
  if (reinforcement) {
    return side === "enemy" ? "unit.reinforcement-enemy" : "unit.reinforcement-allied";
  }
  if (side === "enemy") return "unit.enemy";
  if (side === "protected") return "unit.protected";
  return "unit.allied";
}
