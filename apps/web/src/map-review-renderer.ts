import { Application, Container, Graphics, Text } from "pixi.js";
import layout from "../../../content/encounters/candidates/ch01-b01.layout-candidate.json";

export interface MapReviewCell {
  readonly x: number;
  readonly y: number;
}

export interface MapReviewRendererOptions {
  readonly showGrid: boolean;
  readonly showCoordinates: boolean;
  readonly showRoute: boolean;
  readonly showUnits: boolean;
  readonly selected: MapReviewCell;
}

interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

const TILE_WIDTH = 84;
const TILE_HEIGHT = 42;
const ELEVATION_STEP = 24;
const PADDING = 76;

function key(cell: MapReviewCell): string {
  return `${cell.x},${cell.y}`;
}

function projection(cell: MapReviewCell, elevation = 0): ScreenPoint {
  return {
    x: (cell.x - cell.y) * (TILE_WIDTH / 2),
    y: (cell.x + cell.y) * (TILE_HEIGHT / 2) - elevation * ELEVATION_STEP,
  };
}

function tilePoints(point: ScreenPoint): number[] {
  return [
    point.x,
    point.y - TILE_HEIGHT / 2,
    point.x + TILE_WIDTH / 2,
    point.y,
    point.x,
    point.y + TILE_HEIGHT / 2,
    point.x - TILE_WIDTH / 2,
    point.y,
  ];
}

const blocked = new Set(layout.terrain.blockedCells.map(key));
const elevations = new Map(layout.terrain.elevationCells.map((cell) => [key(cell), cell.level]));
const routeAnchors = new Set(layout.cart.routeAnchors.map(key));
const exitZone = new Set(layout.cart.exitZone.map(key));
const road = new Set(
  layout.environmentIntent.functionalRegions
    .filter((region) => ["west-approach", "central-road", "east-bend"].includes(region.id))
    .flatMap((region) => region.cells.map(key)),
);
const northRidge = new Set(
  layout.environmentIntent.functionalRegions
    .filter((region) => region.id === "north-ridge")
    .flatMap((region) => region.cells.map(key)),
);
const southTrack = new Set(
  layout.environmentIntent.functionalRegions
    .filter((region) => region.id === "south-track")
    .flatMap((region) => region.cells.map(key)),
);

function routeFootprint(): Set<string> {
  const cells = new Set<string>();
  for (const anchor of layout.cart.routeAnchors) {
    cells.add(key(anchor));
    cells.add(key({ x: anchor.x + 1, y: anchor.y }));
  }
  return cells;
}

const cartClearance = routeFootprint();

function terrainFill(cell: MapReviewCell): number {
  const cellKey = key(cell);
  if (road.has(cellKey)) return 0x766849;
  if (northRidge.has(cellKey)) return 0x66704c;
  if (southTrack.has(cellKey)) return 0x5f6747;
  return (cell.x + cell.y) % 2 === 0 ? 0x4f633f : 0x566a44;
}

function drawElevationWalls(world: Container, point: ScreenPoint, elevation: number): void {
  if (elevation <= 0) return;
  const baseY = point.y + elevation * ELEVATION_STEP;
  const left = new Graphics()
    .poly([
      point.x - TILE_WIDTH / 2,
      point.y,
      point.x,
      point.y + TILE_HEIGHT / 2,
      point.x,
      baseY + TILE_HEIGHT / 2,
      point.x - TILE_WIDTH / 2,
      baseY,
    ])
    .fill(0x3f412d)
    .stroke({ color: 0x77704b, width: 1, alpha: 0.65 });
  const right = new Graphics()
    .poly([
      point.x + TILE_WIDTH / 2,
      point.y,
      point.x,
      point.y + TILE_HEIGHT / 2,
      point.x,
      baseY + TILE_HEIGHT / 2,
      point.x + TILE_WIDTH / 2,
      baseY,
    ])
    .fill(0x343829)
    .stroke({ color: 0x625f43, width: 1, alpha: 0.62 });
  world.addChild(left, right);
}

function drawTree(world: Container, point: ScreenPoint, seed: number): void {
  const trunkX = point.x + ((seed % 3) - 1) * 5;
  const trunkY = point.y - 12 - (seed % 2) * 4;
  const shadow = new Graphics().ellipse(trunkX, point.y + 1, 17, 6).fill({ color: 0x0a100c, alpha: 0.3 });
  const trunk = new Graphics().rect(trunkX - 3, trunkY - 2, 6, 18).fill(0x5a4530);
  const crown = new Graphics()
    .circle(trunkX - 5, trunkY - 10, 14)
    .circle(trunkX + 7, trunkY - 12, 15)
    .circle(trunkX + 1, trunkY - 22, 16)
    .fill(seed % 2 === 0 ? 0x29452d : 0x315037)
    .stroke({ color: 0x182d20, width: 2, alpha: 0.9 });
  world.addChild(shadow, trunk, crown);
}

function drawRoadDetail(world: Container, point: ScreenPoint): void {
  world.addChild(
    new Graphics()
      .moveTo(point.x - 22, point.y + 5)
      .lineTo(point.x + 18, point.y - 3)
      .moveTo(point.x - 11, point.y - 6)
      .lineTo(point.x + 24, point.y + 2)
      .stroke({ color: 0x9a8961, width: 1.5, alpha: 0.35 }),
  );
}

function drawFieldDetail(world: Container, point: ScreenPoint, seed: number): void {
  const detail = new Graphics();
  for (let index = 0; index < 3; index += 1) {
    const offset = -16 + index * 12 + (seed % 3);
    detail.moveTo(point.x + offset, point.y - 4).lineTo(point.x + offset + 8, point.y + 3);
  }
  detail.stroke({ color: 0xb6a66e, width: 1, alpha: 0.22 });
  world.addChild(detail);
}

function deploymentFor(cell: MapReviewCell) {
  return layout.deployment.initial.find((entry) => key(entry.cell) === key(cell));
}

function reinforcementFor(cell: MapReviewCell) {
  return layout.deployment.reinforcements.find((entry) => key(entry.entryCell) === key(cell));
}

function markerLabel(entry: (typeof layout.deployment.initial)[number]): string {
  if (entry.id === "mc") return "MC";
  if (entry.id === "julie") return "J";
  if (entry.id.startsWith("civilian")) return "C";
  if (entry.id.startsWith("local-escort")) return "E";
  if (entry.id.startsWith("forager")) return "F";
  return "•";
}

function reinforcementLabel(entry: (typeof layout.deployment.reinforcements)[number]): string {
  if (entry.id === "hangaku") return "?";
  if (entry.id === "la-hire") return "?";
  if (entry.id.startsWith("forager-reinforcement")) return "R";
  return "+";
}

function drawUnitMarker(
  world: Container,
  point: ScreenPoint,
  side: string,
  label: string,
  reinforcement: boolean,
): void {
  const fill = side === "enemy" ? 0x743f39 : side === "protected" ? 0x776a45 : 0x355b61;
  const stroke = reinforcement ? 0xd6b86f : 0xf1e3bb;
  const shadow = new Graphics().ellipse(point.x, point.y - 2, 16, 5).fill({ color: 0x070b08, alpha: 0.42 });
  const body = new Graphics()
    .poly([-12, -12, 0, -21, 12, -12, 10, 12, 0, 17, -10, 12])
    .fill({ color: fill, alpha: reinforcement ? 0.58 : 0.94 })
    .stroke({ color: stroke, width: reinforcement ? 2 : 1.5, alpha: reinforcement ? 0.9 : 0.72 });
  body.position.set(point.x, point.y - 22);
  const text = new Text({
    text: label,
    style: {
      fill: 0xfff7e7,
      fontFamily: "sans-serif",
      fontSize: 10,
      fontWeight: "700",
      stroke: { color: 0x10150f, width: 2 },
    },
  });
  text.anchor.set(0.5);
  text.position.set(point.x, point.y - 23);
  world.addChild(shadow, body, text);
}

function drawCart(world: Container, point: ScreenPoint): void {
  const shadow = new Graphics().ellipse(point.x + 19, point.y + 1, 36, 8).fill({ color: 0x080b08, alpha: 0.35 });
  const bed = new Graphics()
    .poly([
      point.x - 13,
      point.y - 18,
      point.x + 43,
      point.y - 10,
      point.x + 34,
      point.y + 2,
      point.x - 22,
      point.y - 7,
    ])
    .fill(0x755237)
    .stroke({ color: 0xc29d65, width: 1.5 });
  const cargo = new Graphics()
    .rect(point.x - 1, point.y - 31, 26, 14)
    .fill(0x8f734c)
    .stroke({ color: 0xd0b27a, width: 1 });
  const wheels = new Graphics()
    .circle(point.x - 7, point.y - 2, 6)
    .circle(point.x + 31, point.y + 4, 6)
    .fill(0x31281f)
    .stroke({ color: 0x9f8055, width: 2 });
  world.addChild(shadow, bed, cargo, wheels);
}

export class MapReviewRenderer {
  readonly #host: HTMLElement;
  readonly #onSelect: (cell: MapReviewCell) => void;
  readonly #app = new Application();
  #ready = false;
  #resizeObserver: ResizeObserver | undefined;
  #options: MapReviewRendererOptions;

  constructor(
    host: HTMLElement,
    options: MapReviewRendererOptions,
    onSelect: (cell: MapReviewCell) => void,
  ) {
    this.#host = host;
    this.#options = options;
    this.#onSelect = onSelect;
  }

  async init(): Promise<void> {
    await this.#app.init({
      preference: "webgl",
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    this.#app.canvas.dataset.testid = "b01-map-2p5d-canvas";
    this.#app.canvas.setAttribute("aria-label", "CH01-B01 fixed 2.5D candidate battlefield review");
    this.#host.replaceChildren(this.#app.canvas);
    this.#ready = true;
    this.#resizeObserver = new ResizeObserver(() => this.#resize());
    this.#resizeObserver.observe(this.#host);
    this.#resize();
  }

  update(options: MapReviewRendererOptions): void {
    this.#options = options;
    if (this.#ready) this.#draw();
  }

  destroy(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = undefined;
    this.#app.destroy(true, { children: true });
    this.#ready = false;
  }

  #resize(): void {
    if (!this.#ready) return;
    const width = Math.max(480, Math.floor(this.#host.clientWidth));
    const height = Math.max(300, Math.floor(this.#host.clientHeight));
    this.#app.renderer.resize(width, height);
    this.#draw();
  }

  #draw(): void {
    this.#app.stage.removeChildren().forEach((child) => child.destroy({ children: true }));

    const cells: Array<{ cell: MapReviewCell; elevation: number; point: ScreenPoint }> = [];
    for (let y = layout.bounds.minY; y <= layout.bounds.maxY; y += 1) {
      for (let x = layout.bounds.minX; x <= layout.bounds.maxX; x += 1) {
        const cell = { x, y };
        const elevation = elevations.get(key(cell)) ?? 0;
        cells.push({ cell, elevation, point: projection(cell, elevation) });
      }
    }

    const xs = cells.flatMap(({ point }) => [point.x - TILE_WIDTH / 2, point.x + TILE_WIDTH / 2]);
    const ys = cells.flatMap(({ point }) => [point.y - 90, point.y + TILE_HEIGHT / 2 + 12]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const contentWidth = maxX - minX + PADDING * 2;
    const contentHeight = maxY - minY + PADDING * 2;
    const scale = Math.min(
      1.18,
      Math.max(
        0.42,
        Math.min(this.#app.screen.width / contentWidth, this.#app.screen.height / contentHeight),
      ),
    );

    const world = new Container();
    world.scale.set(scale);
    world.x = (this.#app.screen.width - contentWidth * scale) / 2 + (PADDING - minX) * scale;
    world.y = (this.#app.screen.height - contentHeight * scale) / 2 + (PADDING - minY) * scale;
    this.#app.stage.addChild(world);

    const sorted = [...cells].sort((left, right) => {
      const depth = left.cell.x + left.cell.y - (right.cell.x + right.cell.y);
      if (depth !== 0) return depth;
      return left.elevation - right.elevation;
    });

    for (const { cell, elevation, point } of sorted) {
      const cellKey = key(cell);
      drawElevationWalls(world, point, elevation);

      const tile = new Graphics()
        .poly(tilePoints(point))
        .fill({ color: terrainFill(cell), alpha: 1 })
        .stroke({
          color: this.#options.showGrid ? 0x9c9a79 : 0x48583e,
          width: this.#options.showGrid ? 0.9 : 0.35,
          alpha: this.#options.showGrid ? 0.46 : 0.25,
        });
      tile.eventMode = "static";
      tile.cursor = "pointer";
      tile.on("pointertap", () => this.#onSelect(cell));
      world.addChild(tile);

      if (road.has(cellKey)) drawRoadDetail(world, point);
      else if (!blocked.has(cellKey)) drawFieldDetail(world, point, cell.x * 31 + cell.y * 17);

      if (this.#options.showRoute && cartClearance.has(cellKey)) {
        world.addChild(
          new Graphics()
            .poly(tilePoints(point))
            .fill({ color: 0x82bfd0, alpha: routeAnchors.has(cellKey) ? 0.16 : 0.08 })
            .stroke({ color: 0x9cd9e8, width: routeAnchors.has(cellKey) ? 1.6 : 0.8, alpha: 0.62 }),
        );
      }
      if (this.#options.showRoute && exitZone.has(cellKey)) {
        world.addChild(
          new Graphics()
            .poly(tilePoints(point))
            .fill({ color: 0x75c8a8, alpha: 0.13 })
            .stroke({ color: 0x8fddbd, width: 2, alpha: 0.88 }),
        );
      }

      if (cellKey === key(this.#options.selected)) {
        world.addChild(
          new Graphics()
            .poly(tilePoints(point))
            .fill({ color: 0xe0c27a, alpha: 0.08 })
            .stroke({ color: 0xf1d795, width: 2.4, alpha: 0.96 }),
        );
      }

      if (this.#options.showCoordinates) {
        const coordinate = new Text({
          text: `${cell.x},${cell.y}${elevation ? ` +${elevation}` : ""}`,
          style: {
            fill: 0xf4efe5,
            fontFamily: "ui-monospace, monospace",
            fontSize: 7,
            fontWeight: "700",
            stroke: { color: 0x12180f, width: 2 },
          },
        });
        coordinate.anchor.set(0.5);
        coordinate.position.set(point.x, point.y + 1);
        world.addChild(coordinate);
      }
    }

    for (const { cell, point } of sorted) {
      if (!blocked.has(key(cell))) continue;
      drawTree(world, point, cell.x * 13 + cell.y * 29);
    }

    drawCart(world, projection(layout.cart.startAnchor, elevations.get(key(layout.cart.startAnchor)) ?? 0));

    if (this.#options.showUnits) {
      for (const entry of layout.deployment.initial) {
        const point = projection(entry.cell, elevations.get(key(entry.cell)) ?? 0);
        drawUnitMarker(world, point, entry.side, markerLabel(entry), false);
      }
      for (const entry of layout.deployment.reinforcements) {
        const point = projection(entry.entryCell, elevations.get(key(entry.entryCell)) ?? 0);
        const side = entry.id.startsWith("forager") ? "enemy" : "allied";
        drawUnitMarker(world, point, side, reinforcementLabel(entry), true);
      }
    }
  }
}
