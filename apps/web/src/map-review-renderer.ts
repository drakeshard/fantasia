import { Application, Container, Graphics, Text } from "pixi.js";
import layout from "../../../content/encounters/candidates/ch01-b01.layout-candidate.json";

export interface MapReviewCell {
  readonly x: number;
  readonly y: number;
}

export interface MapReviewElevationCell extends MapReviewCell {
  readonly level: number;
}

export type MapReviewTerrainKind = "road" | "ridge" | "track" | "basin" | "plateau";

export interface MapReviewTerrainRegion {
  readonly kind: MapReviewTerrainKind;
  readonly cells: readonly MapReviewCell[];
}

export interface MapReviewUnitMarker {
  readonly cell: MapReviewCell;
  readonly side: string;
  readonly label: string;
  readonly reinforcement: boolean;
}

export interface MapReviewRendererScene {
  readonly bounds: {
    readonly minX: number;
    readonly maxX: number;
    readonly minY: number;
    readonly maxY: number;
  };
  readonly blockedCells: readonly MapReviewCell[];
  readonly elevationCells: readonly MapReviewElevationCell[];
  readonly terrainRegions: readonly MapReviewTerrainRegion[];
  readonly routeAnchors: readonly MapReviewCell[];
  readonly routeClearanceCells: readonly MapReviewCell[];
  readonly exitZone: readonly MapReviewCell[];
  readonly units: readonly MapReviewUnitMarker[];
  readonly cartStart?: MapReviewCell;
  readonly testIdPrefix: string;
  readonly ariaLabel: string;
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

interface DisplayCell extends ScreenPoint {
  readonly depth: number;
}

interface VisibleNeighbors {
  readonly left: MapReviewCell;
  readonly right: MapReviewCell;
}

const TILE_WIDTH = 84;
const TILE_HEIGHT = 42;
const ELEVATION_STEP = 24;
const PADDING = 76;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 1.16;
const DRAG_THRESHOLD = 5;

function key(cell: MapReviewCell): string {
  return `${cell.x},${cell.y}`;
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
  if (entry.id === "hangaku" || entry.id === "la-hire") return "?";
  if (entry.id.startsWith("forager-reinforcement")) return "R";
  return "+";
}

function cartClearanceFor(routeAnchors: readonly MapReviewCell[]): MapReviewCell[] {
  return routeAnchors.flatMap((anchor) => [anchor, { x: anchor.x + 1, y: anchor.y }]);
}

const b01RoadCells = layout.environmentIntent.functionalRegions
  .filter((region) => ["west-approach", "central-road", "east-bend"].includes(region.id))
  .flatMap((region) => region.cells);
const b01RidgeCells = layout.environmentIntent.functionalRegions
  .filter((region) => region.id === "north-ridge")
  .flatMap((region) => region.cells);
const b01TrackCells = layout.environmentIntent.functionalRegions
  .filter((region) => region.id === "south-track")
  .flatMap((region) => region.cells);

const B01_SCENE: MapReviewRendererScene = {
  bounds: layout.bounds,
  blockedCells: layout.terrain.blockedCells,
  elevationCells: layout.terrain.elevationCells,
  terrainRegions: [
    { kind: "road", cells: b01RoadCells },
    { kind: "ridge", cells: b01RidgeCells },
    { kind: "track", cells: b01TrackCells },
  ],
  routeAnchors: layout.cart.routeAnchors,
  routeClearanceCells: cartClearanceFor(layout.cart.routeAnchors),
  exitZone: layout.cart.exitZone,
  units: [
    ...layout.deployment.initial.map((entry) => ({
      cell: entry.cell,
      side: entry.side,
      label: markerLabel(entry),
      reinforcement: false,
    })),
    ...layout.deployment.reinforcements.map((entry) => ({
      cell: entry.entryCell,
      side: entry.id.startsWith("forager") ? "enemy" : "allied",
      label: reinforcementLabel(entry),
      reinforcement: true,
    })),
  ],
  cartStart: layout.cart.startAnchor,
  testIdPrefix: "b01-map-2p5d",
  ariaLabel: "CH01-B01 interactive 2.5D candidate battlefield review",
};

function rotatedCell(
  cell: MapReviewCell,
  rotation: number,
  bounds: MapReviewRendererScene["bounds"],
): MapReviewCell {
  const x = cell.x - bounds.minX;
  const y = cell.y - bounds.minY;
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  switch (rotation) {
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

function projection(
  cell: MapReviewCell,
  elevation: number,
  rotation: number,
  bounds: MapReviewRendererScene["bounds"],
): DisplayCell {
  const display = rotatedCell(cell, rotation, bounds);
  return {
    x: (display.x - display.y) * (TILE_WIDTH / 2),
    y: (display.x + display.y) * (TILE_HEIGHT / 2) - elevation * ELEVATION_STEP,
    depth: display.x + display.y,
  };
}

function visibleNeighbors(cell: MapReviewCell, rotation: number): VisibleNeighbors {
  switch (rotation) {
    case 1:
      return {
        left: { x: cell.x - 1, y: cell.y },
        right: { x: cell.x, y: cell.y + 1 },
      };
    case 2:
      return {
        left: { x: cell.x, y: cell.y - 1 },
        right: { x: cell.x - 1, y: cell.y },
      };
    case 3:
      return {
        left: { x: cell.x + 1, y: cell.y },
        right: { x: cell.x, y: cell.y - 1 },
      };
    default:
      return {
        left: { x: cell.x, y: cell.y + 1 },
        right: { x: cell.x + 1, y: cell.y },
      };
  }
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

function terrainFill(kind: MapReviewTerrainKind | undefined, cell: MapReviewCell): number {
  if (kind === "road") return 0x766849;
  if (kind === "ridge") return 0x66704c;
  if (kind === "track") return 0x5f6747;
  if (kind === "basin") return 0x3d5147;
  if (kind === "plateau") return 0x756845;
  return (cell.x + cell.y) % 2 === 0 ? 0x4f633f : 0x566a44;
}

function drawElevationWalls(
  world: Container,
  point: ScreenPoint,
  leftDrop: number,
  rightDrop: number,
): number {
  let faces = 0;
  if (leftDrop > 0) {
    const baseY = point.y + leftDrop * ELEVATION_STEP;
    world.addChild(
      new Graphics()
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
        .stroke({ color: 0x77704b, width: 1, alpha: 0.65 }),
    );
    faces += 1;
  }
  if (rightDrop > 0) {
    const baseY = point.y + rightDrop * ELEVATION_STEP;
    world.addChild(
      new Graphics()
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
        .stroke({ color: 0x625f43, width: 1, alpha: 0.62 }),
    );
    faces += 1;
  }
  return faces;
}

function drawTree(world: Container, point: ScreenPoint, seed: number): void {
  const trunkX = point.x + ((seed % 3) - 1) * 5;
  const trunkY = point.y - 12 - (seed % 2) * 4;
  world.addChild(
    new Graphics().ellipse(trunkX, point.y + 1, 17, 6).fill({ color: 0x0a100c, alpha: 0.3 }),
    new Graphics().rect(trunkX - 3, trunkY - 2, 6, 18).fill(0x5a4530),
    new Graphics()
      .circle(trunkX - 5, trunkY - 10, 14)
      .circle(trunkX + 7, trunkY - 12, 15)
      .circle(trunkX + 1, trunkY - 22, 16)
      .fill(seed % 2 === 0 ? 0x29452d : 0x315037)
      .stroke({ color: 0x182d20, width: 2, alpha: 0.9 }),
  );
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

function drawUnitMarker(
  world: Container,
  point: ScreenPoint,
  side: string,
  label: string,
  reinforcement: boolean,
): void {
  const fill = side === "enemy" ? 0x743f39 : side === "protected" ? 0x776a45 : 0x355b61;
  const body = new Graphics()
    .poly([-12, -12, 0, -21, 12, -12, 10, 12, 0, 17, -10, 12])
    .fill({ color: fill, alpha: reinforcement ? 0.58 : 0.94 })
    .stroke({ color: reinforcement ? 0xd6b86f : 0xf1e3bb, width: reinforcement ? 2 : 1.5 });
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
  world.addChild(
    new Graphics().ellipse(point.x, point.y - 2, 16, 5).fill({ color: 0x070b08, alpha: 0.42 }),
    body,
    text,
  );
}

function drawCart(world: Container, point: ScreenPoint): void {
  world.addChild(
    new Graphics().ellipse(point.x + 19, point.y + 1, 36, 8).fill({ color: 0x080b08, alpha: 0.35 }),
    new Graphics()
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
      .stroke({ color: 0xc29d65, width: 1.5 }),
    new Graphics()
      .rect(point.x - 1, point.y - 31, 26, 14)
      .fill(0x8f734c)
      .stroke({ color: 0xd0b27a, width: 1 }),
    new Graphics()
      .circle(point.x - 7, point.y - 2, 6)
      .circle(point.x + 31, point.y + 4, 6)
      .fill(0x31281f)
      .stroke({ color: 0x9f8055, width: 2 }),
  );
}

function signedElevation(level: number): string {
  return level > 0 ? `+${level}` : String(level);
}

export class MapReviewRenderer {
  readonly #host: HTMLElement;
  readonly #onSelect: (cell: MapReviewCell) => void;
  readonly #scene: MapReviewRendererScene;
  readonly #blocked: ReadonlySet<string>;
  readonly #elevations: ReadonlyMap<string, number>;
  readonly #routeAnchors: ReadonlySet<string>;
  readonly #routeClearance: ReadonlySet<string>;
  readonly #exitZone: ReadonlySet<string>;
  readonly #terrainKinds: ReadonlyMap<string, MapReviewTerrainKind>;
  readonly #app = new Application();
  #ready = false;
  #resizeObserver: ResizeObserver | undefined;
  #options: MapReviewRendererOptions;
  #rotation = 0;
  #zoom = 1;
  #panX = 0;
  #panY = 0;
  #pointerId: number | undefined;
  #pointerStartX = 0;
  #pointerStartY = 0;
  #lastPointerX = 0;
  #lastPointerY = 0;
  #dragged = false;
  #suppressTap = false;
  #tapTimer: number | undefined;
  #world: Container | undefined;
  #fitScale = 1;
  #contentWidth = 1;
  #contentHeight = 1;
  #minX = 0;
  #minY = 0;

  constructor(
    host: HTMLElement,
    options: MapReviewRendererOptions,
    onSelect: (cell: MapReviewCell) => void,
    scene: MapReviewRendererScene = B01_SCENE,
  ) {
    this.#host = host;
    this.#options = options;
    this.#onSelect = onSelect;
    this.#scene = scene;
    this.#blocked = new Set(scene.blockedCells.map(key));
    this.#elevations = new Map(scene.elevationCells.map((cell) => [key(cell), cell.level]));
    this.#routeAnchors = new Set(scene.routeAnchors.map(key));
    this.#routeClearance = new Set(scene.routeClearanceCells.map(key));
    this.#exitZone = new Set(scene.exitZone.map(key));
    const terrainKinds = new Map<string, MapReviewTerrainKind>();
    for (const region of scene.terrainRegions) {
      for (const cell of region.cells) terrainKinds.set(key(cell), region.kind);
    }
    this.#terrainKinds = terrainKinds;
  }

  async init(): Promise<void> {
    await this.#app.init({
      preference: "webgl",
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    const canvas = this.#app.canvas;
    canvas.dataset.testid = `${this.#scene.testIdPrefix}-canvas`;
    canvas.setAttribute("aria-label", this.#scene.ariaLabel);
    canvas.style.touchAction = "none";
    this.#host.replaceChildren(canvas);
    canvas.addEventListener("wheel", this.#handleWheel, { passive: false });
    canvas.addEventListener("pointerdown", this.#handlePointerDown);
    canvas.addEventListener("pointermove", this.#handlePointerMove);
    canvas.addEventListener("pointerup", this.#handlePointerUp);
    canvas.addEventListener("pointercancel", this.#handlePointerUp);
    this.#ready = true;
    this.#resizeObserver = new ResizeObserver(() => this.#resize());
    this.#resizeObserver.observe(this.#host);
    this.#resize();
  }

  update(options: MapReviewRendererOptions): void {
    this.#options = options;
    if (this.#ready) this.#draw();
  }

  zoomIn(): void {
    this.#setZoom(this.#zoom * ZOOM_STEP);
  }

  zoomOut(): void {
    this.#setZoom(this.#zoom / ZOOM_STEP);
  }

  rotateLeft(): void {
    this.#rotation = (this.#rotation + 3) % 4;
    this.#panX = 0;
    this.#panY = 0;
    this.#draw();
  }

  rotateRight(): void {
    this.#rotation = (this.#rotation + 1) % 4;
    this.#panX = 0;
    this.#panY = 0;
    this.#draw();
  }

  fit(): void {
    this.#zoom = 1;
    this.#panX = 0;
    this.#panY = 0;
    this.#applyCamera();
  }

  destroy(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = undefined;
    if (this.#tapTimer !== undefined) window.clearTimeout(this.#tapTimer);
    if (!this.#ready) return;
    const canvas = this.#app.canvas;
    canvas.removeEventListener("wheel", this.#handleWheel);
    canvas.removeEventListener("pointerdown", this.#handlePointerDown);
    canvas.removeEventListener("pointermove", this.#handlePointerMove);
    canvas.removeEventListener("pointerup", this.#handlePointerUp);
    canvas.removeEventListener("pointercancel", this.#handlePointerUp);
    this.#app.destroy(true, { children: true });
    this.#ready = false;
  }

  readonly #handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.#setZoom(this.#zoom * (event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP));
  };

  readonly #handlePointerDown = (event: PointerEvent): void => {
    if (this.#pointerId !== undefined) return;
    this.#pointerId = event.pointerId;
    this.#pointerStartX = event.clientX;
    this.#pointerStartY = event.clientY;
    this.#lastPointerX = event.clientX;
    this.#lastPointerY = event.clientY;
    this.#dragged = false;
    this.#app.canvas.setPointerCapture(event.pointerId);
  };

  readonly #handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    const fromStart = Math.hypot(
      event.clientX - this.#pointerStartX,
      event.clientY - this.#pointerStartY,
    );
    if (!this.#dragged && fromStart < DRAG_THRESHOLD) return;
    this.#dragged = true;
    this.#suppressTap = true;
    this.#panX += event.clientX - this.#lastPointerX;
    this.#panY += event.clientY - this.#lastPointerY;
    this.#lastPointerX = event.clientX;
    this.#lastPointerY = event.clientY;
    this.#applyCamera();
  };

  readonly #handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    if (this.#app.canvas.hasPointerCapture(event.pointerId)) {
      this.#app.canvas.releasePointerCapture(event.pointerId);
    }
    this.#pointerId = undefined;
    if (this.#dragged) {
      if (this.#tapTimer !== undefined) window.clearTimeout(this.#tapTimer);
      this.#tapTimer = window.setTimeout(() => {
        this.#suppressTap = false;
      }, 80);
    }
    this.#dragged = false;
  };

  #setZoom(next: number): void {
    this.#zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
    this.#applyCamera();
  }

  #applyCamera(): void {
    this.#updateCameraDataset();
    const world = this.#world;
    if (!world) return;
    const scale = this.#fitScale * this.#zoom;
    world.scale.set(scale);
    world.x =
      (this.#app.screen.width - this.#contentWidth * scale) / 2 +
      (PADDING - this.#minX) * scale +
      this.#panX;
    world.y =
      (this.#app.screen.height - this.#contentHeight * scale) / 2 +
      (PADDING - this.#minY) * scale +
      this.#panY;
  }

  #resize(): void {
    if (!this.#ready) return;
    this.#app.renderer.resize(
      Math.max(320, Math.floor(this.#host.clientWidth)),
      Math.max(240, Math.floor(this.#host.clientHeight)),
    );
    this.#draw();
  }

  #updateCameraDataset(): void {
    this.#host.dataset.cameraRotation = String(this.#rotation * 90);
    this.#host.dataset.cameraZoom = this.#zoom.toFixed(2);
    this.#host.dataset.cameraPan = `${Math.round(this.#panX)},${Math.round(this.#panY)}`;
  }

  #isInside(cell: MapReviewCell): boolean {
    return (
      cell.x >= this.#scene.bounds.minX &&
      cell.x <= this.#scene.bounds.maxX &&
      cell.y >= this.#scene.bounds.minY &&
      cell.y <= this.#scene.bounds.maxY
    );
  }

  #elevationAt(cell: MapReviewCell): number {
    if (!this.#isInside(cell)) return 0;
    return this.#elevations.get(key(cell)) ?? 0;
  }

  #draw(): void {
    if (!this.#ready) return;
    this.#updateCameraDataset();
    this.#app.stage.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });
    const cells: Array<{
      cell: MapReviewCell;
      elevation: number;
      point: DisplayCell;
    }> = [];
    for (let y = this.#scene.bounds.minY; y <= this.#scene.bounds.maxY; y += 1) {
      for (let x = this.#scene.bounds.minX; x <= this.#scene.bounds.maxX; x += 1) {
        const cell = { x, y };
        const elevation = this.#elevationAt(cell);
        cells.push({
          cell,
          elevation,
          point: projection(cell, elevation, this.#rotation, this.#scene.bounds),
        });
      }
    }

    const xs = cells.flatMap(({ point }) => [point.x - TILE_WIDTH / 2, point.x + TILE_WIDTH / 2]);
    const ys = cells.flatMap(({ point }) => [point.y - 90, point.y + TILE_HEIGHT / 2 + 12]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    this.#contentWidth = maxX - minX + PADDING * 2;
    this.#contentHeight = maxY - minY + PADDING * 2;
    this.#minX = minX;
    this.#minY = minY;
    this.#fitScale = Math.min(
      1.3,
      Math.max(
        0.32,
        Math.min(
          this.#app.screen.width / this.#contentWidth,
          this.#app.screen.height / this.#contentHeight,
        ),
      ),
    );
    const world = new Container();
    this.#world = world;
    this.#app.stage.addChild(world);
    this.#applyCamera();

    const sorted = [...cells].sort((left, right) => {
      const depth = left.point.depth - right.point.depth;
      return depth !== 0 ? depth : left.elevation - right.elevation;
    });

    let elevationFaceCount = 0;
    for (const { cell, elevation, point } of sorted) {
      const cellKey = key(cell);
      const neighbors = visibleNeighbors(cell, this.#rotation);
      const leftDrop = Math.max(0, elevation - this.#elevationAt(neighbors.left));
      const rightDrop = Math.max(0, elevation - this.#elevationAt(neighbors.right));
      elevationFaceCount += drawElevationWalls(world, point, leftDrop, rightDrop);
      const tile = new Graphics()
        .poly(tilePoints(point))
        .fill({ color: terrainFill(this.#terrainKinds.get(cellKey), cell), alpha: 1 })
        .stroke({
          color: this.#options.showGrid ? 0x9c9a79 : 0x48583e,
          width: this.#options.showGrid ? 0.9 : 0.35,
          alpha: this.#options.showGrid ? 0.46 : 0.25,
        });
      tile.eventMode = "static";
      tile.cursor = "pointer";
      tile.on("pointertap", () => {
        if (!this.#suppressTap) this.#onSelect(cell);
      });
      world.addChild(tile);
      if (this.#terrainKinds.get(cellKey) === "road") drawRoadDetail(world, point);
      else if (!this.#blocked.has(cellKey))
        drawFieldDetail(world, point, cell.x * 31 + cell.y * 17);

      if (this.#options.showRoute && this.#routeClearance.has(cellKey)) {
        world.addChild(
          new Graphics()
            .poly(tilePoints(point))
            .fill({ color: 0x82bfd0, alpha: this.#routeAnchors.has(cellKey) ? 0.16 : 0.08 })
            .stroke({
              color: 0x9cd9e8,
              width: this.#routeAnchors.has(cellKey) ? 1.6 : 0.8,
              alpha: 0.62,
            }),
        );
      }
      if (this.#options.showRoute && this.#exitZone.has(cellKey)) {
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
          text: `${cell.x},${cell.y}${elevation ? ` ${signedElevation(elevation)}` : ""}`,
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
      if (this.#blocked.has(key(cell))) drawTree(world, point, cell.x * 13 + cell.y * 29);
    }

    const elevationValues = cells.map(({ elevation }) => elevation);
    this.#host.dataset.renderedCellCount = String(cells.length);
    this.#host.dataset.elevationMin = String(Math.min(...elevationValues));
    this.#host.dataset.elevationMax = String(Math.max(...elevationValues));
    this.#host.dataset.elevationFaceCount = String(elevationFaceCount);

    if (this.#scene.cartStart) {
      drawCart(
        world,
        projection(
          this.#scene.cartStart,
          this.#elevationAt(this.#scene.cartStart),
          this.#rotation,
          this.#scene.bounds,
        ),
      );
    }
    if (!this.#options.showUnits) return;
    for (const unit of this.#scene.units) {
      drawUnitMarker(
        world,
        projection(unit.cell, this.#elevationAt(unit.cell), this.#rotation, this.#scene.bounds),
        unit.side,
        unit.label,
        unit.reinforcement,
      );
    }
  }
}
