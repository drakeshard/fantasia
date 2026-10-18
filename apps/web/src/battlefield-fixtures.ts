import type { BattlefieldRenderScene } from "./battlefield-scene.js";
import {
  AVALON_ARTHURIA_CONFRONTATION,
  GHOST_SEA_HUNT,
  type EnvironmentSceneDefinition,
} from "./environment-scenes-data.js";

const REFERENCE_BOUNDS = { minX: 0, maxX: 9, minY: 0, maxY: 7 } as const;

function rectangle(minX: number, maxX: number, minY: number, maxY: number) {
  return Array.from({ length: maxY - minY + 1 }, (_, row) =>
    Array.from({ length: maxX - minX + 1 }, (_, column) => ({
      x: minX + column,
      y: minY + row,
    })),
  ).flat();
}

export const REFERENCE_BATTLEFIELD_SCENE: BattlefieldRenderScene = {
  id: "reference.standard-battlefield",
  bounds: REFERENCE_BOUNDS,
  blockedCells: [
    { x: 1, y: 1 },
    { x: 1, y: 2 },
    { x: 7, y: 5 },
    { x: 8, y: 5 },
  ],
  elevationCells: [
    { x: 5, y: 2, level: 1 },
    { x: 6, y: 2, level: 1 },
    { x: 5, y: 3, level: 2 },
    { x: 6, y: 3, level: 2 },
    { x: 5, y: 4, level: 1 },
    { x: 6, y: 4, level: 1 },
  ],
  terrainRegions: [
    { visualId: "terrain.grass", cells: rectangle(0, 9, 0, 7) },
    { visualId: "terrain.road", cells: rectangle(0, 9, 3, 3) },
    { visualId: "terrain.ridge", cells: rectangle(5, 6, 2, 4) },
  ],
  blockedPropVisualId: "prop.woodland",
  routeAnchors: [
    { x: 2, y: 3 },
    { x: 3, y: 3 },
    { x: 4, y: 3 },
  ],
  routeClearanceCells: [
    { x: 2, y: 2 },
    { x: 2, y: 3 },
    { x: 2, y: 4 },
    { x: 3, y: 2 },
    { x: 3, y: 3 },
    { x: 3, y: 4 },
  ],
  exitZone: [{ x: 9, y: 3 }],
  units: [
    { cell: { x: 2, y: 3 }, visualId: "unit.allied", label: "MC" },
    { cell: { x: 4, y: 3 }, visualId: "unit.protected", label: "VIP" },
    { cell: { x: 7, y: 3 }, visualId: "unit.enemy", label: "EN" },
  ],
};

export interface BattlefieldViewerFixture {
  readonly id: string;
  readonly title: string;
  readonly kicker: string;
  readonly description: string;
  readonly kind: "reference" | "stress";
  readonly scene: BattlefieldRenderScene;
  readonly focusCell: Readonly<{ x: number; y: number }>;
  readonly showUnits: boolean;
  readonly stressSource?: EnvironmentSceneDefinition;
}

export const REFERENCE_BATTLEFIELD_FIXTURE: BattlefieldViewerFixture = {
  id: "reference",
  title: "Standard Battlefield",
  kicker: "Reference Fixture · Engine Contract",
  description:
    "Small representative battlefield used for renderer interaction, camera, accessibility and browser E2E coverage.",
  kind: "reference",
  scene: REFERENCE_BATTLEFIELD_SCENE,
  focusCell: { x: 4, y: 3 },
  showUnits: true,
};

function stressFixture(definition: EnvironmentSceneDefinition): BattlefieldViewerFixture {
  return {
    id: definition.id,
    title: definition.title,
    kicker: definition.kicker,
    description: definition.description,
    kind: "stress",
    scene: definition.scene,
    focusCell: definition.focusCell,
    showUnits: definition.showUnits,
    stressSource: definition,
  };
}

export const BATTLEFIELD_VIEWER_FIXTURES = [
  REFERENCE_BATTLEFIELD_FIXTURE,
  stressFixture(GHOST_SEA_HUNT),
  stressFixture(AVALON_ARTHURIA_CONFRONTATION),
] as const;
