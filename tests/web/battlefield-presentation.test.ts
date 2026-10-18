import { describe, expect, it } from "vitest";
import { battlefieldUnitVisualId } from "../../apps/web/src/battlefield-scene.js";
import {
  FANTASIA_BATTLEFIELD_RENDER_PROFILE,
  FANTASIA_BATTLEFIELD_VISUAL_CATALOG,
  projectSquareCell,
  terrainVisualForCell,
  visibleSquareNeighbors,
} from "../../apps/web/src/battlefield-presentation.js";

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
    expect(FANTASIA_BATTLEFIELD_VISUAL_CATALOG.terrain["terrain.road"].textureAssetId).toBe(
      undefined,
    );
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
});
