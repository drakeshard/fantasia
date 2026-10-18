import type {
  BattlefieldBounds,
  BattlefieldCellCoord,
  BattlefieldProjectedCell,
  BattlefieldPropVisualId,
  BattlefieldTerrainVisualId,
  BattlefieldUnitVisualId,
} from "./battlefield-presentation.js";
import { projectSquareCell } from "./battlefield-presentation.js";
import type { BattlefieldRenderScene } from "./battlefield-scene.js";

export interface BattlefieldRenderCell extends BattlefieldCellCoord {
  readonly elevation: number;
  readonly terrainVisualId: BattlefieldTerrainVisualId;
  readonly blocked?: boolean;
  readonly reachable?: boolean;
  readonly path?: boolean;
  readonly reachableCost?: number;
  readonly propVisualId?: BattlefieldPropVisualId;
}

export interface BattlefieldRenderUnit {
  readonly id: string;
  readonly cell: BattlefieldCellCoord;
  readonly visualId: BattlefieldUnitVisualId;
  readonly label: string;
  readonly selected?: boolean;
  readonly active?: boolean;
  readonly defeated?: boolean;
}

export interface BattlefieldRenderFrame {
  readonly id: string;
  readonly bounds: BattlefieldBounds;
  readonly cells: readonly BattlefieldRenderCell[];
  readonly units: readonly BattlefieldRenderUnit[];
}

export interface BattlefieldCompiledCell {
  readonly cell: BattlefieldRenderCell;
  readonly point: BattlefieldProjectedCell;
}

export interface BattlefieldCompiledFrame {
  readonly source: BattlefieldRenderFrame;
  readonly rotation: number;
  readonly orderedCells: readonly BattlefieldCompiledCell[];
  readonly cellByKey: ReadonlyMap<string, BattlefieldRenderCell>;
  readonly unitByCellKey: ReadonlyMap<string, BattlefieldRenderUnit>;
  readonly stats: {
    readonly cellCount: number;
    readonly unitCount: number;
    readonly indexedCellCount: number;
    readonly projectedCellCount: number;
  };
}

export function battlefieldCellKey(cell: BattlefieldCellCoord): string {
  return `${cell.x}:${cell.y}`;
}

export function compileBattlefieldFrame(
  frame: BattlefieldRenderFrame,
  rotation = 0,
): BattlefieldCompiledFrame {
  const normalizedRotation = ((rotation % 4) + 4) % 4;
  const cellByKey = new Map<string, BattlefieldRenderCell>();
  const projected: BattlefieldCompiledCell[] = [];

  for (const cell of frame.cells) {
    const key = battlefieldCellKey(cell);
    if (cellByKey.has(key)) throw new Error(`Duplicate battlefield cell ${key} in ${frame.id}.`);
    cellByKey.set(key, cell);
    projected.push({
      cell,
      point: projectSquareCell(cell, cell.elevation, normalizedRotation, frame.bounds),
    });
  }

  projected.sort((left, right) => {
    const depth = left.point.depth - right.point.depth;
    if (depth !== 0) return depth;
    const elevation = left.cell.elevation - right.cell.elevation;
    if (elevation !== 0) return elevation;
    return left.cell.y - right.cell.y || left.cell.x - right.cell.x;
  });

  const unitByCellKey = new Map<string, BattlefieldRenderUnit>();
  for (const unit of frame.units) {
    const key = battlefieldCellKey(unit.cell);
    if (!cellByKey.has(key)) throw new Error(`Battlefield unit ${unit.id} is outside frame ${frame.id}.`);
    if (unitByCellKey.has(key)) throw new Error(`Multiple battlefield units occupy ${key} in ${frame.id}.`);
    unitByCellKey.set(key, unit);
  }

  return {
    source: frame,
    rotation: normalizedRotation,
    orderedCells: projected,
    cellByKey,
    unitByCellKey,
    stats: {
      cellCount: frame.cells.length,
      unitCount: frame.units.length,
      indexedCellCount: cellByKey.size,
      projectedCellCount: projected.length,
    },
  };
}

export function authoredSceneToBattlefieldFrame(scene: BattlefieldRenderScene): BattlefieldRenderFrame {
  const elevationByKey = new Map(
    scene.elevationCells.map((cell) => [battlefieldCellKey(cell), cell.level] as const),
  );
  const blocked = new Set(scene.blockedCells.map(battlefieldCellKey));
  const route = new Set(scene.routeAnchors.map(battlefieldCellKey));
  const routeClearance = new Set(scene.routeClearanceCells.map(battlefieldCellKey));
  const exitZone = new Set(scene.exitZone.map(battlefieldCellKey));
  const terrainByKey = new Map<string, BattlefieldTerrainVisualId>();
  for (const region of scene.terrainRegions) {
    for (const cell of region.cells) terrainByKey.set(battlefieldCellKey(cell), region.visualId);
  }

  const cells: BattlefieldRenderCell[] = [];
  for (let y = scene.bounds.minY; y <= scene.bounds.maxY; y += 1) {
    for (let x = scene.bounds.minX; x <= scene.bounds.maxX; x += 1) {
      const cell = { x, y };
      const key = battlefieldCellKey(cell);
      const isBlocked = blocked.has(key);
      cells.push({
        ...cell,
        elevation: elevationByKey.get(key) ?? 0,
        terrainVisualId: terrainByKey.get(key) ?? (isBlocked ? "terrain.blocked" : "terrain.grass"),
        ...(isBlocked ? { blocked: true, propVisualId: scene.blockedPropVisualId } : {}),
        ...(route.has(key) ? { path: true } : {}),
        ...(routeClearance.has(key) ? { reachable: true } : {}),
        ...(exitZone.has(key) ? { reachable: true } : {}),
      });
    }
  }

  return {
    id: scene.id,
    bounds: scene.bounds,
    cells,
    units: scene.units.map((unit, index) => ({
      id: `${scene.id}:unit:${index}`,
      cell: unit.cell,
      visualId: unit.visualId,
      label: unit.label,
    })),
  };
}
