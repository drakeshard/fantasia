import type { BattlefieldRenderScene } from "./battlefield-scene.js";
import type {
  BattlefieldCellCoord,
  BattlefieldTerrainVisualId,
} from "./battlefield-presentation.js";

export type EnvironmentWeatherVisualId = "weather.ghost-mist" | "weather.avalon-mist";

export interface EnvironmentWeatherRegion {
  readonly visualId: EnvironmentWeatherVisualId;
  readonly cells: readonly BattlefieldCellCoord[];
  readonly intensity: number;
}

export interface EnvironmentSceneDefinition {
  readonly id: "ghost-sea-hunt" | "avalon-arthuria-confrontation";
  readonly title: string;
  readonly kicker: string;
  readonly description: string;
  readonly scene: BattlefieldRenderScene;
  readonly weatherRegions: readonly EnvironmentWeatherRegion[];
  readonly focusCell: BattlefieldCellCoord;
  readonly paletteNotes: readonly string[];
  readonly showUnits: boolean;
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

function ellipse(
  cells: readonly BattlefieldCellCoord[],
  center: BattlefieldCellCoord,
  radiusX: number,
  radiusY: number,
): BattlefieldCellCoord[] {
  return where(cells, ({ x, y }) => {
    const dx = (x - center.x) / radiusX;
    const dy = (y - center.y) / radiusY;
    return dx * dx + dy * dy <= 1;
  });
}

function deck(
  cells: readonly BattlefieldCellCoord[],
  center: BattlefieldCellCoord,
  halfLength: number,
  halfWidth: number,
): BattlefieldCellCoord[] {
  return where(
    cells,
    ({ x, y }) => Math.abs(x - center.x) <= halfLength && Math.abs(y - center.y) <= halfWidth,
  );
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

const LARGE_BOUNDS = { minX: 0, maxX: 63, minY: 0, maxY: 63 } as const;
const LARGE_SCENE_CELLS = cellsIn(LARGE_BOUNDS);

const leagueShipCenters = [
  { x: 10, y: 18 },
  { x: 17, y: 27 },
  { x: 11, y: 37 },
  { x: 21, y: 45 },
  { x: 26, y: 17 },
  { x: 29, y: 33 },
  { x: 31, y: 51 },
] as const;
const leagueDecks = leagueShipCenters.flatMap((center, index) =>
  deck(LARGE_SCENE_CELLS, center, index % 2 === 0 ? 3 : 4, 1),
);
const dutchmanCenter = { x: 50, y: 17 } as const;
const dutchmanDeck = deck(LARGE_SCENE_CELLS, dutchmanCenter, 5, 2);
const krakenCenter = { x: 50, y: 43 } as const;
const krakenAbyss = ellipse(LARGE_SCENE_CELLS, krakenCenter, 10, 8);
const ghostChannels = where(
  LARGE_SCENE_CELLS,
  ({ x, y }) => (x + y) % 13 === 0 || (x * 3 + y * 5) % 29 === 0,
);
const ghostSeaElevation = [
  ...leagueDecks.map((cell) => ({ ...cell, level: 2 })),
  ...dutchmanDeck.map((cell) => ({ ...cell, level: 3 })),
];

export const GHOST_SEA_HUNT: EnvironmentSceneDefinition = {
  id: "ghost-sea-hunt",
  title: "Ghost Sea Hunt",
  kicker: "Environment Stress Scene 01 · Seven Sea League",
  description:
    "A 64×64 haunted ocean staging ground: seven allied vessels form a battle line while the Flying Dutchman and a Kraken wait beyond a ghost-lit abyss.",
  scene: {
    id: "environment.ghost-sea-hunt",
    bounds: LARGE_BOUNDS,
    blockedCells: [],
    elevationCells: ghostSeaElevation,
    terrainRegions: [
      { visualId: "terrain.water.deep", cells: LARGE_SCENE_CELLS },
      { visualId: "terrain.water.ghost", cells: ghostChannels },
      { visualId: "terrain.water.abyss", cells: krakenAbyss },
      { visualId: "terrain.deck", cells: [...leagueDecks, ...dutchmanDeck] },
    ],
    blockedPropVisualId: "prop.rubble",
    routeAnchors: [],
    routeClearanceCells: [],
    exitZone: [],
    units: [
      ...leagueShipCenters.map((cell, index) => ({
        cell,
        visualId: index < 4 ? ("unit.allied" as const) : ("unit.reinforcement-allied" as const),
        label: `S${index + 1}`,
      })),
      { cell: dutchmanCenter, visualId: "unit.enemy", label: "Dutchman" },
      { cell: krakenCenter, visualId: "unit.enemy", label: "Kraken" },
    ],
    testIdPrefix: "environment-ghost-sea",
    ariaLabel: "Ghost Sea Hunt large environment battlefield review",
  },
  weatherRegions: [
    { visualId: "weather.ghost-mist", cells: LARGE_SCENE_CELLS, intensity: 0.8 },
  ],
  focusCell: krakenCenter,
  paletteNotes: [
    "Deep sea · ghost water · abyss · raised ship decks",
    "Seven Sea League staging markers · Flying Dutchman · Kraken",
    "Full-field weather.ghost-mist presentation",
  ],
  showUnits: true,
};

const avalonCenter = { x: 43, y: 31 } as const;
const avalonLakeWest = where(
  LARGE_SCENE_CELLS,
  ({ x, y }) => x <= 8 + Math.round(3 * Math.sin(y / 6)),
);
const avalonLakeSouth = where(
  LARGE_SCENE_CELLS,
  ({ x, y }) => y >= 58 - Math.round(2 * Math.cos(x / 7)) && x >= 22,
);
const enchantedWater = [...avalonLakeWest, ...avalonLakeSouth];
const enchantedShore = where(
  LARGE_SCENE_CELLS,
  ({ x, y }) =>
    x === 9 + Math.round(3 * Math.sin(y / 6)) ||
    (y === 57 - Math.round(2 * Math.cos(x / 7)) && x >= 22),
);
const sacredHill = ellipse(LARGE_SCENE_CELLS, avalonCenter, 12, 9);
const innerSanctum = ellipse(LARGE_SCENE_CELLS, avalonCenter, 6, 5);
const causeway = where(
  LARGE_SCENE_CELLS,
  ({ x, y }) => x >= 12 && x <= 43 && Math.abs(y - (28 + Math.floor((x - 12) / 10))) <= 1,
);
const avalonElevation = sacredHill.map((cell) => {
  const dx = (cell.x - avalonCenter.x) / 12;
  const dy = (cell.y - avalonCenter.y) / 9;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const level = distance < 0.32 ? 5 : distance < 0.55 ? 4 : distance < 0.76 ? 3 : 2;
  return { ...cell, level };
});

export const AVALON_ARTHURIA_CONFRONTATION: EnvironmentSceneDefinition = {
  id: "avalon-arthuria-confrontation",
  title: "Avalon — Arthuria Confrontation",
  kicker: "Environment Stress Scene 02 · Avalon Approach",
  description:
    "A 64×64 mist-bound Avalon battlefield of enchanted water, meadow and a rising sacred causeway leading to Arthuria's central position.",
  scene: {
    id: "environment.avalon-arthuria-confrontation",
    bounds: LARGE_BOUNDS,
    blockedCells: [],
    elevationCells: avalonElevation,
    terrainRegions: [
      { visualId: "terrain.meadow.mist", cells: LARGE_SCENE_CELLS },
      { visualId: "terrain.water.enchanted", cells: enchantedWater },
      { visualId: "terrain.shore", cells: enchantedShore },
      { visualId: "terrain.stone.sacred", cells: [...causeway, ...sacredHill, ...innerSanctum] },
    ],
    blockedPropVisualId: "prop.woodland",
    routeAnchors: [],
    routeClearanceCells: [],
    exitZone: [],
    units: [
      { cell: { x: 15, y: 28 }, visualId: "unit.allied", label: "Vanguard" },
      { cell: { x: 19, y: 32 }, visualId: "unit.allied", label: "Guard" },
      { cell: { x: 24, y: 27 }, visualId: "unit.reinforcement-allied", label: "Reserve" },
      { cell: avalonCenter, visualId: "unit.enemy", label: "Arthuria" },
    ],
    testIdPrefix: "environment-avalon",
    ariaLabel: "Avalon Arthuria confrontation large environment battlefield review",
  },
  weatherRegions: [
    { visualId: "weather.avalon-mist", cells: LARGE_SCENE_CELLS, intensity: 0.58 },
  ],
  focusCell: avalonCenter,
  paletteNotes: [
    "Mist meadow · enchanted water · shore · sacred stone",
    "Raised Avalon sanctum with a long causeway approach",
    "Full-field weather.avalon-mist presentation",
  ],
  showUnits: true,
};

export const ENVIRONMENT_SCENES = [GHOST_SEA_HUNT, AVALON_ARTHURIA_CONFRONTATION] as const;

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
