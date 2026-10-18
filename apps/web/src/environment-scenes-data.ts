import type { BattlefieldRenderScene } from "./battlefield-scene.js";
import type {
  BattlefieldCellCoord,
  BattlefieldTerrainVisualId,
} from "./battlefield-presentation.js";

export type EnvironmentWeatherVisualId = "weather.blizzard";

export interface EnvironmentWeatherRegion {
  readonly visualId: EnvironmentWeatherVisualId;
  readonly cells: readonly BattlefieldCellCoord[];
  readonly intensity: number;
}

export interface EnvironmentSceneDefinition {
  readonly id: "twin-isles-shore" | "canyon-blizzard-frontier";
  readonly title: string;
  readonly kicker: string;
  readonly description: string;
  readonly scene: BattlefieldRenderScene;
  readonly weatherRegions: readonly EnvironmentWeatherRegion[];
}

interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

function cellsIn(bounds: Bounds): BattlefieldCellCoord[] {
  const cells: BattlefieldCellCoord[] = [];
  for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
    for (let x = bounds.minX; x <= bounds.maxX; x += 1) cells.push({ x, y });
  }
  return cells;
}

function where(
  cells: readonly BattlefieldCellCoord[],
  predicate: (cell: BattlefieldCellCoord) => boolean,
): BattlefieldCellCoord[] {
  return cells.filter(predicate);
}

function manhattan(cell: BattlefieldCellCoord, center: BattlefieldCellCoord): number {
  return Math.abs(cell.x - center.x) + Math.abs(cell.y - center.y);
}

function terrainAt(scene: BattlefieldRenderScene, cell: BattlefieldCellCoord): BattlefieldTerrainVisualId {
  let visualId: BattlefieldTerrainVisualId = "terrain.grass";
  for (const region of scene.terrainRegions) {
    if (region.cells.some((candidate) => candidate.x === cell.x && candidate.y === cell.y)) {
      visualId = region.visualId;
    }
  }
  return visualId;
}

const COAST_BOUNDS = { minX: 0, maxX: 27, minY: 0, maxY: 17 } as const;
const coastCells = cellsIn(COAST_BOUNDS);

const mainland = where(
  coastCells,
  ({ x, y }) => y >= 13 + (x % 6 === 0 ? -1 : x % 5 === 0 ? 1 : 0),
);
const mainlandShore = where(
  coastCells,
  ({ x, y }) => y === 12 + (x % 6 === 0 ? -1 : x % 5 === 0 ? 1 : 0),
);
const mainlandShallow = where(
  coastCells,
  ({ x, y }) => y === 11 + (x % 6 === 0 ? -1 : x % 5 === 0 ? 1 : 0),
);

const islandACenter = { x: 8, y: 6 } as const;
const islandBCenter = { x: 19, y: 7 } as const;
const islandALand = where(coastCells, (cell) => manhattan(cell, islandACenter) <= 3);
const islandBLand = where(
  coastCells,
  (cell) => Math.abs(cell.x - islandBCenter.x) * 0.8 + Math.abs(cell.y - islandBCenter.y) <= 3.5,
);
const islandAShore = where(coastCells, (cell) => manhattan(cell, islandACenter) === 4);
const islandBShore = where(
  coastCells,
  (cell) => {
    const distance = Math.abs(cell.x - islandBCenter.x) * 0.8 + Math.abs(cell.y - islandBCenter.y);
    return distance > 3.5 && distance <= 4.7;
  },
);
const islandShallows = where(coastCells, (cell) => {
  const aDistance = manhattan(cell, islandACenter);
  const bDistance = Math.abs(cell.x - islandBCenter.x) * 0.8 + Math.abs(cell.y - islandBCenter.y);
  return aDistance === 5 || (bDistance > 4.7 && bDistance <= 5.7);
});

const coastElevation = [
  ...where(coastCells, (cell) => manhattan(cell, islandACenter) <= 1).map((cell) => ({
    ...cell,
    level: 2,
  })),
  ...where(
    coastCells,
    (cell) => Math.abs(cell.x - islandBCenter.x) <= 1 && Math.abs(cell.y - islandBCenter.y) <= 1,
  ).map((cell) => ({ ...cell, level: cell.x === islandBCenter.x ? 3 : 2 })),
];

export const TWIN_ISLES_SHORE: EnvironmentSceneDefinition = {
  id: "twin-isles-shore",
  title: "Twin Isles Shore",
  kicker: "Environment Scene 01 · Coastal Waters",
  description:
    "Open sea meets a broken mainland shore while two raised islands sit inside bands of shallow water.",
  scene: {
    id: "environment.twin-isles-shore",
    bounds: COAST_BOUNDS,
    blockedCells: [],
    elevationCells: coastElevation,
    terrainRegions: [
      { visualId: "terrain.water.deep", cells: coastCells },
      { visualId: "terrain.water.shallow", cells: [...mainlandShallow, ...islandShallows] },
      { visualId: "terrain.shore", cells: [...mainlandShore, ...islandAShore, ...islandBShore] },
      { visualId: "terrain.grass", cells: [...mainland, ...islandALand, ...islandBLand] },
      {
        visualId: "terrain.ridge",
        cells: where(coastCells, (cell) => coastElevation.some((entry) => entry.x === cell.x && entry.y === cell.y)),
      },
    ],
    blockedPropVisualId: "prop.woodland",
    routeAnchors: [],
    routeClearanceCells: [],
    exitZone: [],
    units: [],
    testIdPrefix: "environment-twin-isles",
    ariaLabel: "Twin Isles Shore environment battlefield review",
  },
  weatherRegions: [],
};

const FRONTIER_BOUNDS = { minX: 0, maxX: 29, minY: 0, maxY: 19 } as const;
const frontierCells = cellsIn(FRONTIER_BOUNDS);
const desert = where(frontierCells, ({ x }) => x <= 11);
const canyon = where(
  frontierCells,
  ({ x, y }) => x >= 8 && x <= 19 && !((x === 13 || x === 14) && y >= 2 && y <= 17),
);
const canyonFloor = where(frontierCells, ({ x, y }) => (x === 13 || x === 14) && y >= 1 && y <= 18);
const tundra = where(frontierCells, ({ x }) => x >= 18);
const snow = where(frontierCells, ({ x, y }) => x >= 23 || (x >= 21 && (x + y) % 4 === 0));
const canyonElevation = canyon.map((cell) => {
  const rim = cell.x <= 10 || cell.x >= 17 ? 2 : 3;
  const mesa = (cell.y >= 3 && cell.y <= 6) || (cell.y >= 13 && cell.y <= 16) ? 2 : 0;
  return { ...cell, level: Math.min(5, rim + mesa) };
});
const blizzardCells = where(frontierCells, ({ x }) => x >= 21);

export const CANYON_BLIZZARD_FRONTIER: EnvironmentSceneDefinition = {
  id: "canyon-blizzard-frontier",
  title: "Canyon Blizzard Frontier",
  kicker: "Environment Scene 02 · Climate Frontier",
  description:
    "Warm desert falls into a raised canyon system before the eastern field turns to tundra, snow and a dense blizzard front.",
  scene: {
    id: "environment.canyon-blizzard-frontier",
    bounds: FRONTIER_BOUNDS,
    blockedCells: [],
    elevationCells: canyonElevation,
    terrainRegions: [
      { visualId: "terrain.sand", cells: desert },
      { visualId: "terrain.canyon", cells: canyon },
      { visualId: "terrain.sand", cells: canyonFloor },
      { visualId: "terrain.tundra", cells: tundra },
      { visualId: "terrain.snow", cells: snow },
    ],
    blockedPropVisualId: "prop.rubble",
    routeAnchors: [],
    routeClearanceCells: [],
    exitZone: [],
    units: [],
    testIdPrefix: "environment-canyon-blizzard",
    ariaLabel: "Canyon Blizzard Frontier environment battlefield review",
  },
  weatherRegions: [{ visualId: "weather.blizzard", cells: blizzardCells, intensity: 0.86 }],
};

export const ENVIRONMENT_SCENES = [TWIN_ISLES_SHORE, CANYON_BLIZZARD_FRONTIER] as const;

export function terrainVisualIdAt(
  definition: EnvironmentSceneDefinition,
  cell: BattlefieldCellCoord,
): BattlefieldTerrainVisualId {
  return terrainAt(definition.scene, cell);
}

export function weatherVisualIdAt(
  definition: EnvironmentSceneDefinition,
  cell: BattlefieldCellCoord,
): EnvironmentWeatherVisualId | undefined {
  return definition.weatherRegions.find((region) =>
    region.cells.some((candidate) => candidate.x === cell.x && candidate.y === cell.y),
  )?.visualId;
}
