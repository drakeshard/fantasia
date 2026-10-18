import { describe, expect, it } from "vitest";
import {
  authoredSceneToBattlefieldFrame,
  battlefieldCellKey,
  compileBattlefieldFrame,
} from "../../apps/web/src/battlefield-engine.js";
import { REFERENCE_BATTLEFIELD_SCENE } from "../../apps/web/src/battlefield-fixtures.js";
import {
  AVALON_ARTHURIA_CONFRONTATION,
  GHOST_SEA_HUNT,
} from "../../apps/web/src/environment-scenes-data.js";

describe("standardized battlefield engine", () => {
  it("compiles the reference battlefield into deterministic indexed render state", () => {
    const frame = authoredSceneToBattlefieldFrame(REFERENCE_BATTLEFIELD_SCENE);
    const compiled = compileBattlefieldFrame(frame);

    expect(frame.cells).toHaveLength(80);
    expect(compiled.stats).toEqual({
      cellCount: 80,
      unitCount: 3,
      indexedCellCount: 80,
      projectedCellCount: 80,
    });
    expect(compiled.cellByKey.get("5:3")).toMatchObject({ elevation: 2, terrainVisualId: "terrain.ridge" });
    expect(compiled.unitByCellKey.get("4:3")?.label).toBe("VIP");
  });

  it("uses the same frame compiler for all camera rotations", () => {
    const frame = authoredSceneToBattlefieldFrame(REFERENCE_BATTLEFIELD_SCENE);
    for (const rotation of [0, 1, 2, 3]) {
      const compiled = compileBattlefieldFrame(frame, rotation);
      expect(compiled.rotation).toBe(rotation);
      expect(compiled.orderedCells).toHaveLength(frame.cells.length);
      expect(compiled.cellByKey.size).toBe(frame.cells.length);
    }
  });

  it("rejects invalid duplicate cells and unit occupancy before rendering", () => {
    expect(() =>
      compileBattlefieldFrame({
        id: "invalid-duplicate-cell",
        bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 },
        cells: [
          { x: 0, y: 0, elevation: 0, terrainVisualId: "terrain.grass" },
          { x: 0, y: 0, elevation: 0, terrainVisualId: "terrain.grass" },
        ],
        units: [],
      }),
    ).toThrow(/Duplicate battlefield cell/);
  });

  it.each([
    ["Ghost Sea", GHOST_SEA_HUNT],
    ["Avalon", AVALON_ARTHURIA_CONFRONTATION],
  ])("compiles the 64x64 %s scene as a stress fixture without timing thresholds", (_name, fixture) => {
    const frame = authoredSceneToBattlefieldFrame(fixture.scene);
    const compiled = compileBattlefieldFrame(frame);

    expect(frame.cells).toHaveLength(4096);
    expect(compiled.stats.cellCount).toBe(4096);
    expect(compiled.stats.indexedCellCount).toBe(4096);
    expect(compiled.stats.projectedCellCount).toBe(4096);
    expect(compiled.cellByKey.get(battlefieldCellKey(fixture.focusCell))).toBeDefined();
  });
});
