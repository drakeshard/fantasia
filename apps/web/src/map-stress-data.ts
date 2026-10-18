export interface StressMapCell {
  readonly x: number;
  readonly y: number;
}

export type StressTerrain = "basin" | "plain" | "road" | "forest" | "ridge" | "plateau";

export interface StressMapCellData extends StressMapCell {
  readonly elevation: number;
  readonly terrain: StressTerrain;
  readonly blocked: boolean;
}

export const STRESS_MAP_WIDTH = 30;
export const STRESS_MAP_HEIGHT = 20;
export const STRESS_MAP_MIN_ELEVATION = -7;
export const STRESS_MAP_MAX_ELEVATION = 7;

function clampElevation(value: number): number {
  return Math.max(STRESS_MAP_MIN_ELEVATION, Math.min(STRESS_MAP_MAX_ELEVATION, value));
}

export function stressElevationAt(x: number, y: number): number {
  const westToEast = Math.round((x / (STRESS_MAP_WIDTH - 1)) * 14) - 7;
  const basinDistance = Math.hypot(x - 10, y - 12);
  const ridgeDistance = Math.hypot(x - 21, y - 6);
  const basin = basinDistance < 3.2 ? -2 : basinDistance < 5 ? -1 : 0;
  const ridge = ridgeDistance < 2.8 ? 2 : ridgeDistance < 4.6 ? 1 : 0;
  const terrace = y <= 3 && x >= 15 ? 1 : y >= 17 && x <= 13 ? -1 : 0;
  return clampElevation(westToEast + basin + ridge + terrace);
}

export function stressTerrainAt(x: number, y: number, elevation: number): StressTerrain {
  if (Math.abs(y - (10 + Math.round(Math.sin(x / 3) * 2))) <= 1) return "road";
  if ((x < 8 && y > 2 && y < 9) || (x > 18 && x < 26 && y > 12 && y < 18)) {
    return "forest";
  }
  if (elevation <= -4) return "basin";
  if (elevation >= 6) return "plateau";
  if (elevation >= 3) return "ridge";
  return "plain";
}

export function stressCellAt(x: number, y: number): StressMapCellData {
  const elevation = stressElevationAt(x, y);
  const terrain = stressTerrainAt(x, y, elevation);
  return {
    x,
    y,
    elevation,
    terrain,
    blocked: terrain === "forest" && (x + y) % 3 !== 0,
  };
}

export const STRESS_MAP_CELLS: readonly StressMapCellData[] = Array.from(
  { length: STRESS_MAP_WIDTH * STRESS_MAP_HEIGHT },
  (_, index) => {
    const x = index % STRESS_MAP_WIDTH;
    const y = Math.floor(index / STRESS_MAP_WIDTH);
    return stressCellAt(x, y);
  },
);

export const STRESS_MAP_BY_KEY: ReadonlyMap<string, StressMapCellData> = new Map(
  STRESS_MAP_CELLS.map((cell) => [`${cell.x},${cell.y}`, cell] as const),
);

export const STRESS_MAP_MIN_SENTINEL = STRESS_MAP_CELLS.find(
  (cell) => cell.elevation === STRESS_MAP_MIN_ELEVATION,
) ?? { x: 0, y: 0, elevation: -7, terrain: "basin" as const, blocked: false };

export const STRESS_MAP_MAX_SENTINEL = STRESS_MAP_CELLS.find(
  (cell) => cell.elevation === STRESS_MAP_MAX_ELEVATION,
) ?? { x: 29, y: 0, elevation: 7, terrain: "plateau" as const, blocked: false };
