export interface StressCell {
  readonly x: number;
  readonly y: number;
}

export interface StressBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export const STRESS_BOUNDS: StressBounds = {
  minX: 0,
  maxX: 31,
  minY: 0,
  maxY: 23,
};

export const STRESS_WIDTH = STRESS_BOUNDS.maxX - STRESS_BOUNDS.minX + 1;
export const STRESS_HEIGHT = STRESS_BOUNDS.maxY - STRESS_BOUNDS.minY + 1;
export const STRESS_CELL_COUNT = STRESS_WIDTH * STRESS_HEIGHT;
export const STRESS_MIN_ELEVATION = -7;
export const STRESS_MAX_ELEVATION = 7;

function clampElevation(value: number): number {
  return Math.max(STRESS_MIN_ELEVATION, Math.min(STRESS_MAX_ELEVATION, value));
}

/**
 * Deterministic non-canonical terrain used only to stress the map-review presentation.
 * Broad north-to-south terraces are disturbed by a western ridge, central saddle,
 * eastern shelf and southeast basin so the renderer sees both gradual and abrupt
 * neighbor-relative elevation changes. The corner plateaus deliberately guarantee
 * exact +7 and -7 audit points.
 */
export function stressElevationAt(cell: StressCell): number {
  const { x, y } = cell;
  if (x <= 3 && y <= 3) return STRESS_MAX_ELEVATION;
  if (x >= 28 && y >= 20) return STRESS_MIN_ELEVATION;

  const northSouth = Math.round(7 - (y * 14) / (STRESS_HEIGHT - 1));
  const westernRidge = x >= 4 && x <= 9 && y >= 4 && y <= 16 ? 2 : 0;
  const centralSaddle = x >= 12 && x <= 19 && y >= 7 && y <= 16 ? -2 : 0;
  const easternShelf = x >= 22 && x <= 28 && y >= 4 && y <= 11 ? 2 : 0;
  const southeastBasin = x >= 21 && y >= 15 ? -2 : 0;
  const brokenTerrace = (x + y) % 9 === 0 ? 1 : (x * 2 + y) % 13 === 0 ? -1 : 0;

  return clampElevation(
    northSouth + westernRidge + centralSaddle + easternShelf + southeastBasin + brokenTerrace,
  );
}

export function stressSignedElevation(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function stressTerrainLabel(elevation: number): string {
  if (elevation >= 5) return "High ridge";
  if (elevation >= 2) return "Upper terrace";
  if (elevation >= 0) return "Midland shelf";
  if (elevation >= -3) return "Lower terrace";
  if (elevation >= -5) return "Deep basin";
  return "Valley floor";
}

export function stressCells(): readonly StressCell[] {
  const cells: StressCell[] = [];
  for (let y = STRESS_BOUNDS.minY; y <= STRESS_BOUNDS.maxY; y += 1) {
    for (let x = STRESS_BOUNDS.minX; x <= STRESS_BOUNDS.maxX; x += 1) {
      cells.push({ x, y });
    }
  }
  return cells;
}
