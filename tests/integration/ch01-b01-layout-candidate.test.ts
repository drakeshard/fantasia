import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

interface Cell {
  readonly x: number;
  readonly y: number;
}

interface Bounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

interface LayoutCandidate {
  readonly schemaVersion: number;
  readonly stageId: string;
  readonly status: string;
  readonly gameD222Compliance: boolean;
  readonly bounds: Bounds;
  readonly environmentIntent: {
    readonly functionalRegions: readonly {
      readonly id: string;
      readonly cells: readonly Cell[];
    }[];
  };
  readonly terrain: {
    readonly blockedCells: readonly Cell[];
    readonly elevationCells: readonly (Cell & { readonly level: number })[];
  };
  readonly cart: {
    readonly footprint: {
      readonly width: number;
      readonly height: number;
      readonly orientation: string;
    };
    readonly startAnchor: Cell;
    readonly routeAnchors: readonly Cell[];
    readonly exitZone: readonly Cell[];
  };
  readonly deployment: {
    readonly initial: readonly {
      readonly id: string;
      readonly cell: Cell;
    }[];
    readonly reinforcements: readonly {
      readonly id: string;
      readonly beatId: string;
      readonly entryCell: Cell;
    }[];
  };
  readonly phaseAnnotations: readonly {
    readonly beatId: string;
  }[];
}

const layout = JSON.parse(
  readFileSync("content/encounters/candidates/ch01-b01.layout-candidate.json", "utf8"),
) as LayoutCandidate;
const story = JSON.parse(readFileSync("content/narrative/story.json", "utf8")) as unknown;

function cellKey(cell: Cell): string {
  return `${cell.x}:${cell.y}`;
}

function expectInBounds(cell: Cell, bounds: Bounds): void {
  expect(cell.x).toBeGreaterThanOrEqual(bounds.minX);
  expect(cell.x).toBeLessThanOrEqual(bounds.maxX);
  expect(cell.y).toBeGreaterThanOrEqual(bounds.minY);
  expect(cell.y).toBeLessThanOrEqual(bounds.maxY);
}

function expectUniqueCells(cells: readonly Cell[]): void {
  expect(new Set(cells.map(cellKey)).size).toBe(cells.length);
}

function collectStringIds(value: unknown, ids = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const entry of value) collectStringIds(entry, ids);
    return ids;
  }
  if (value === null || typeof value !== "object") return ids;

  for (const [key, entry] of Object.entries(value)) {
    if ((key === "id" || key === "beatId") && typeof entry === "string") ids.add(entry);
    collectStringIds(entry, ids);
  }
  return ids;
}

describe("CH01-B01 layout candidate", () => {
  it("remains explicitly provisional while GAME-D222 original wording is unavailable", () => {
    expect(layout.schemaVersion).toBe(1);
    expect(layout.stageId).toBe("CH01-B01");
    expect(layout.status).toBe("provisional-layout-candidate");
    expect(layout.gameD222Compliance).toBe(false);
  });

  it("keeps deterministic geometry in bounds without duplicate static cells", () => {
    expect(layout.bounds).toEqual({ minX: 0, maxX: 17, minY: 0, maxY: 11 });
    expectUniqueCells(layout.terrain.blockedCells);
    expectUniqueCells(layout.terrain.elevationCells);

    for (const cell of layout.terrain.blockedCells) expectInBounds(cell, layout.bounds);
    for (const cell of layout.terrain.elevationCells) {
      expectInBounds(cell, layout.bounds);
      expect(cell.level).toBe(1);
    }
  });

  it("keeps functional road cells passable and the 2x1 cart route contiguous and clear", () => {
    const blocked = new Set(layout.terrain.blockedCells.map(cellKey));
    const road = new Set(
      layout.environmentIntent.functionalRegions
        .filter((region) => ["west-approach", "central-road", "east-bend"].includes(region.id))
        .flatMap((region) => region.cells)
        .map(cellKey),
    );

    for (const key of road) expect(blocked.has(key)).toBe(false);

    expect(layout.cart.footprint).toEqual({
      width: 2,
      height: 1,
      orientation: "east-west",
      anchorMeaning: "western occupied cell",
    });
    expect(layout.cart.routeAnchors[0]).toEqual(layout.cart.startAnchor);

    for (const [index, anchor] of layout.cart.routeAnchors.entries()) {
      expectInBounds(anchor, layout.bounds);
      const eastCell = { x: anchor.x + 1, y: anchor.y };
      expectInBounds(eastCell, layout.bounds);
      expect(blocked.has(cellKey(anchor))).toBe(false);
      expect(blocked.has(cellKey(eastCell))).toBe(false);
      expect(road.has(cellKey(anchor))).toBe(true);
      expect(road.has(cellKey(eastCell))).toBe(true);

      if (index > 0) {
        const previous = layout.cart.routeAnchors[index - 1];
        expect(previous).toBeDefined();
        if (previous) {
          const distance = Math.abs(anchor.x - previous.x) + Math.abs(anchor.y - previous.y);
          expect(distance).toBe(1);
        }
      }
    }

    const exit = new Set(layout.cart.exitZone.map(cellKey));
    const finalAnchor = layout.cart.routeAnchors.at(-1);
    expect(finalAnchor).toBeDefined();
    if (finalAnchor) {
      expect(exit.has(cellKey(finalAnchor))).toBe(true);
      expect(exit.has(cellKey({ x: finalAnchor.x + 1, y: finalAnchor.y }))).toBe(true);
    }
  });

  it("keeps deployment markers unique, passable, and linked to approved B01 story beats", () => {
    const blocked = new Set(layout.terrain.blockedCells.map(cellKey));
    const initialCells = layout.deployment.initial.map((entry) => entry.cell);
    const initialIds = layout.deployment.initial.map((entry) => entry.id);
    const reinforcementIds = layout.deployment.reinforcements.map((entry) => entry.id);

    expectUniqueCells(initialCells);
    expect(new Set(initialIds).size).toBe(initialIds.length);
    expect(new Set(reinforcementIds).size).toBe(reinforcementIds.length);

    for (const cell of initialCells) {
      expectInBounds(cell, layout.bounds);
      expect(blocked.has(cellKey(cell))).toBe(false);
    }
    for (const reinforcement of layout.deployment.reinforcements) {
      expectInBounds(reinforcement.entryCell, layout.bounds);
      expect(blocked.has(cellKey(reinforcement.entryCell))).toBe(false);
    }

    const storyIds = collectStringIds(story);
    expect(storyIds.has(layout.stageId)).toBe(true);
    for (const reinforcement of layout.deployment.reinforcements) {
      expect(storyIds.has(reinforcement.beatId)).toBe(true);
    }
    for (const phase of layout.phaseAnnotations) expect(storyIds.has(phase.beatId)).toBe(true);
  });
});
