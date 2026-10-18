export interface BattlefieldCellCoord {
  readonly x: number;
  readonly y: number;
}

export interface BattlefieldBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface BattlefieldRenderProfile {
  readonly tileWidth: number;
  readonly tileHeight: number;
  readonly elevationStep: number;
  readonly padding: number;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly zoomStep: number;
  readonly dragThreshold: number;
}

export interface BattlefieldScreenPoint {
  readonly x: number;
  readonly y: number;
}

export interface BattlefieldProjectedCell extends BattlefieldScreenPoint {
  readonly depth: number;
}

export type BattlefieldTerrainVisualId =
  | "terrain.grass"
  | "terrain.road"
  | "terrain.ridge"
  | "terrain.track"
  | "terrain.basin"
  | "terrain.plateau"
  | "terrain.blocked"
  | "terrain.water.deep"
  | "terrain.water.shallow"
  | "terrain.shore"
  | "terrain.sand"
  | "terrain.canyon"
  | "terrain.tundra"
  | "terrain.snow";

export type BattlefieldPropVisualId = "prop.woodland" | "prop.rubble";

export type BattlefieldUnitVisualId =
  | "unit.allied"
  | "unit.enemy"
  | "unit.protected"
  | "unit.reinforcement-allied"
  | "unit.reinforcement-enemy";

export interface BattlefieldTerrainVisual {
  readonly id: BattlefieldTerrainVisualId;
  readonly fill: number;
  readonly alternateFill?: number;
  readonly border: number;
  readonly detail: "field" | "road" | "none";
  /** Semantic runtime asset ID. Omit until an approved derivative exists. */
  readonly textureAssetId?: string;
}

export interface BattlefieldPropVisual {
  readonly id: BattlefieldPropVisualId;
  readonly fallback: "tree" | "rubble";
  /** Semantic runtime asset ID. Omit until an approved derivative exists. */
  readonly spriteAssetId?: string;
}

export interface BattlefieldUnitVisual {
  readonly id: BattlefieldUnitVisualId;
  readonly fill: number;
  readonly stroke: number;
  readonly cloth: number;
  readonly alpha: number;
  /** Semantic runtime asset ID. Omit until an approved sprite derivative exists. */
  readonly spriteAssetId?: string;
}

export interface BattlefieldVisualCatalog {
  readonly terrain: Readonly<Record<BattlefieldTerrainVisualId, BattlefieldTerrainVisual>>;
  readonly props: Readonly<Record<BattlefieldPropVisualId, BattlefieldPropVisual>>;
  readonly units: Readonly<Record<BattlefieldUnitVisualId, BattlefieldUnitVisual>>;
}

export const FANTASIA_BATTLEFIELD_RENDER_PROFILE: BattlefieldRenderProfile = Object.freeze({
  tileWidth: 84,
  tileHeight: 42,
  elevationStep: 24,
  padding: 76,
  minZoom: 0.6,
  maxZoom: 2.4,
  zoomStep: 1.16,
  dragThreshold: 5,
});

export const FANTASIA_BATTLEFIELD_VISUAL_CATALOG: BattlefieldVisualCatalog = Object.freeze({
  terrain: Object.freeze({
    "terrain.grass": Object.freeze({
      id: "terrain.grass",
      fill: 0x4f633f,
      alternateFill: 0x566a44,
      border: 0x48583e,
      detail: "field",
    }),
    "terrain.road": Object.freeze({
      id: "terrain.road",
      fill: 0x766849,
      border: 0x665b42,
      detail: "road",
    }),
    "terrain.ridge": Object.freeze({
      id: "terrain.ridge",
      fill: 0x66704c,
      border: 0x596143,
      detail: "field",
    }),
    "terrain.track": Object.freeze({
      id: "terrain.track",
      fill: 0x5f6747,
      border: 0x535a3e,
      detail: "field",
    }),
    "terrain.basin": Object.freeze({
      id: "terrain.basin",
      fill: 0x3d5147,
      border: 0x39483f,
      detail: "field",
    }),
    "terrain.plateau": Object.freeze({
      id: "terrain.plateau",
      fill: 0x756845,
      border: 0x64593b,
      detail: "field",
    }),
    "terrain.blocked": Object.freeze({
      id: "terrain.blocked",
      fill: 0x494538,
      border: 0x6e6654,
      detail: "none",
    }),
    "terrain.water.deep": Object.freeze({
      id: "terrain.water.deep",
      fill: 0x173f55,
      alternateFill: 0x1b4960,
      border: 0x24566c,
      detail: "none",
    }),
    "terrain.water.shallow": Object.freeze({
      id: "terrain.water.shallow",
      fill: 0x2d7180,
      alternateFill: 0x347d88,
      border: 0x4b9197,
      detail: "none",
    }),
    "terrain.shore": Object.freeze({
      id: "terrain.shore",
      fill: 0xb69a68,
      alternateFill: 0xc0a875,
      border: 0x8f794f,
      detail: "none",
    }),
    "terrain.sand": Object.freeze({
      id: "terrain.sand",
      fill: 0xa87843,
      alternateFill: 0xb3834d,
      border: 0x775431,
      detail: "field",
    }),
    "terrain.canyon": Object.freeze({
      id: "terrain.canyon",
      fill: 0x75483a,
      alternateFill: 0x81503f,
      border: 0x533229,
      detail: "none",
    }),
    "terrain.tundra": Object.freeze({
      id: "terrain.tundra",
      fill: 0x708087,
      alternateFill: 0x7d8d92,
      border: 0x55656c,
      detail: "field",
    }),
    "terrain.snow": Object.freeze({
      id: "terrain.snow",
      fill: 0xc8d9dc,
      alternateFill: 0xd5e3e5,
      border: 0x9eb7bd,
      detail: "none",
    }),
  }),
  props: Object.freeze({
    "prop.woodland": Object.freeze({ id: "prop.woodland", fallback: "tree" }),
    "prop.rubble": Object.freeze({ id: "prop.rubble", fallback: "rubble" }),
  }),
  units: Object.freeze({
    "unit.allied": Object.freeze({
      id: "unit.allied",
      fill: 0x355b61,
      stroke: 0xf1e3bb,
      cloth: 0x819a87,
      alpha: 0.94,
    }),
    "unit.enemy": Object.freeze({
      id: "unit.enemy",
      fill: 0x743f39,
      stroke: 0xf1e3bb,
      cloth: 0xa95c4c,
      alpha: 0.94,
    }),
    "unit.protected": Object.freeze({
      id: "unit.protected",
      fill: 0x776a45,
      stroke: 0xf1e3bb,
      cloth: 0xb7a56f,
      alpha: 0.94,
    }),
    "unit.reinforcement-allied": Object.freeze({
      id: "unit.reinforcement-allied",
      fill: 0x355b61,
      stroke: 0xd6b86f,
      cloth: 0x819a87,
      alpha: 0.58,
    }),
    "unit.reinforcement-enemy": Object.freeze({
      id: "unit.reinforcement-enemy",
      fill: 0x743f39,
      stroke: 0xd6b86f,
      cloth: 0xa95c4c,
      alpha: 0.58,
    }),
  }),
});

export function rotatedSquareCell(
  cell: BattlefieldCellCoord,
  rotation: number,
  bounds: BattlefieldBounds,
): BattlefieldCellCoord {
  const x = cell.x - bounds.minX;
  const y = cell.y - bounds.minY;
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  switch (((rotation % 4) + 4) % 4) {
    case 1:
      return { x: y, y: width - x };
    case 2:
      return { x: width - x, y: height - y };
    case 3:
      return { x: height - y, y: x };
    default:
      return { x, y };
  }
}

export function projectSquareCell(
  cell: BattlefieldCellCoord,
  elevation: number,
  rotation = 0,
  bounds: BattlefieldBounds = { minX: 0, maxX: 0, minY: 0, maxY: 0 },
  profile: BattlefieldRenderProfile = FANTASIA_BATTLEFIELD_RENDER_PROFILE,
): BattlefieldProjectedCell {
  const display = rotatedSquareCell(cell, rotation, bounds);
  return {
    x: (display.x - display.y) * (profile.tileWidth / 2),
    y: (display.x + display.y) * (profile.tileHeight / 2) - elevation * profile.elevationStep,
    depth: display.x + display.y,
  };
}

export function squareTilePoints(
  point: BattlefieldScreenPoint,
  profile: BattlefieldRenderProfile = FANTASIA_BATTLEFIELD_RENDER_PROFILE,
): number[] {
  return [
    point.x,
    point.y - profile.tileHeight / 2,
    point.x + profile.tileWidth / 2,
    point.y,
    point.x,
    point.y + profile.tileHeight / 2,
    point.x - profile.tileWidth / 2,
    point.y,
  ];
}

export function visibleSquareNeighbors(
  cell: BattlefieldCellCoord,
  rotation: number,
): { readonly left: BattlefieldCellCoord; readonly right: BattlefieldCellCoord } {
  switch (((rotation % 4) + 4) % 4) {
    case 1:
      return { left: { x: cell.x - 1, y: cell.y }, right: { x: cell.x, y: cell.y + 1 } };
    case 2:
      return { left: { x: cell.x, y: cell.y - 1 }, right: { x: cell.x - 1, y: cell.y } };
    case 3:
      return { left: { x: cell.x + 1, y: cell.y }, right: { x: cell.x, y: cell.y - 1 } };
    default:
      return { left: { x: cell.x, y: cell.y + 1 }, right: { x: cell.x + 1, y: cell.y } };
  }
}

export function terrainVisualForCell(
  visualId: BattlefieldTerrainVisualId,
  cell: BattlefieldCellCoord,
  catalog: BattlefieldVisualCatalog = FANTASIA_BATTLEFIELD_VISUAL_CATALOG,
): BattlefieldTerrainVisual & { readonly resolvedFill: number } {
  const visual = catalog.terrain[visualId];
  const resolvedFill =
    visual.alternateFill !== undefined && (cell.x + cell.y) % 2 !== 0
      ? visual.alternateFill
      : visual.fill;
  return { ...visual, resolvedFill };
}
