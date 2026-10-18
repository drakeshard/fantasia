import { describe, expect, it } from "vitest";
import {
  FANTASIA_BATTLEFIELD_RENDER_PROFILE,
  FANTASIA_BATTLEFIELD_VISUAL_CATALOG,
  projectSquareCell,
  terrainVisualForCell,
  visibleSquareNeighbors,
} from "../../apps/web/src/battlefield-presentation.js";
import { battlefieldUnitVisualId } from "../../apps/web/src/battlefield-scene.js";
import {
  AVALON_ARTHURIA_CONFRONTATION,
  GHOST_SEA_HUNT,
  terrainVisualIdAt,
  weatherVisualIdAt,
} from "../../apps/web/src/environment-scenes-data.js";

describe("Fantasia battlefield presentation metadata", () => {
  it("centralizes the isometric cell and elevation metrics", () => {
    expect(FANTASIA_BATTLEFIELD_RENDER_PROFILE).toMatchObject({
      tileWidth: 84,
      tileHeight: 42,
      elevationStep: 24,
    });
  });

  it("projects square cells and logical elevation deterministically", () => {
    expect(projectSquareCell({ x: 2, y: 1 }, 0)).toMatchObject({ x: 42, y: 63, depth: 3 });
    expect(projectSquareCell({ x: 2, y: 1 }, 2)).toMatchObject({ x: 42, y: 15, depth: 3 });
  });

  it("keeps camera rotation neighbor exposure deterministic", () => {
    const cell = { x: 4, y: 7 };
    expect(visibleSquareNeighbors(cell, 0)).toEqual({
      left: { x: 4, y: 8 },
      right: { x: 5, y: 7 },
    });
    expect(visibleSquareNeighbors(cell, 1)).toEqual({
      left: { x: 3, y: 7 },
      right: { x: 4, y: 8 },
    });
  });

  it("resolves reusable terrain materials without requiring approved art", () => {
    expect(terrainVisualForCell("terrain.grass", { x: 0, y: 0 }).resolvedFill).toBe(0x4f633f);
    expect(terrainVisualForCell("terrain.grass", { x: 1, y: 0 }).resolvedFill).toBe(0x566a44);
    expect(FANTASIA_BATTLEFIELD_VISUAL_CATALOG.terrain["terrain.water.ghost"]).toMatchObject({
      detail: "none",
    });
    expect(FANTASIA_BATTLEFIELD_VISUAL_CATALOG.terrain["terrain.deck"]).toBeDefined();
    expect(FANTASIA_BATTLEFIELD_VISUAL_CATALOG.terrain["terrain.stone.sacred"]).toBeDefined();
    expect(
      FANTASIA_BATTLEFIELD_VISUAL_CATALOG.terrain["terrain.water.enchanted"].textureAssetId,
    ).toBe(undefined);
    expect(FANTASIA_BATTLEFIELD_VISUAL_CATALOG.props["prop.woodland"].spriteAssetId).toBe(
      undefined,
    );
  });

  it("maps encounter-side metadata to reusable unit visual IDs", () => {
    expect(battlefieldUnitVisualId("allied", false)).toBe("unit.allied");
    expect(battlefieldUnitVisualId("enemy", false)).toBe("unit.enemy");
    expect(battlefieldUnitVisualId("protected", false)).toBe("unit.protected");
    expect(battlefieldUnitVisualId("enemy", true)).toBe("unit.reinforcement-enemy");
    expect(battlefieldUnitVisualId("allied", true)).toBe("unit.reinforcement-allied");
  });

  it("defines the 64x64 Ghost Sea Hunt from reusable sea and deck materials", () => {
    expect(GHOST_SEA_HUNT.scene.bounds).toEqual({ minX: 0, maxX: 63, minY: 0, maxY: 63 });
    expect(terrainVisualIdAt(GHOST_SEA_HUNT, { x: 0, y: 1 })).toBe("terrain.water.deep");
    expect(terrainVisualIdAt(GHOST_SEA_HUNT, { x: 10, y: 18 })).toBe("terrain.deck");
    expect(terrainVisualIdAt(GHOST_SEA_HUNT, { x: 50, y: 43 })).toBe("terrain.water.abyss");
    expect(weatherVisualIdAt(GHOST_SEA_HUNT, { x: 50, y: 43 })).toBe("weather.ghost-mist");
    expect(GHOST_SEA_HUNT.weatherRegions[0]?.cells).toHaveLength(4096);
    expect(GHOST_SEA_HUNT.scene.units.map((unit) => unit.label)).toContain("Dutchman");
    expect(GHOST_SEA_HUNT.scene.units.map((unit) => unit.label)).toContain("Kraken");
  });

  it("defines the 64x64 Avalon confrontation from reusable enchanted materials", () => {
    expect(AVALON_ARTHURIA_CONFRONTATION.scene.bounds).toEqual({
      minX: 0,
      maxX: 63,
      minY: 0,
      maxY: 63,
    });
    expect(terrainVisualIdAt(AVALON_ARTHURIA_CONFRONTATION, { x: 0, y: 20 })).toBe(
      "terrain.water.enchanted",
    );
    expect(terrainVisualIdAt(AVALON_ARTHURIA_CONFRONTATION, { x: 43, y: 31 })).toBe(
      "terrain.stone.sacred",
    );
    expect(weatherVisualIdAt(AVALON_ARTHURIA_CONFRONTATION, { x: 43, y: 31 })).toBe(
      "weather.avalon-mist",
    );
    expect(AVALON_ARTHURIA_CONFRONTATION.weatherRegions[0]?.cells).toHaveLength(4096);
    expect(AVALON_ARTHURIA_CONFRONTATION.scene.units.map((unit) => unit.label)).toContain(
      "Arthuria",
    );
  });
});
