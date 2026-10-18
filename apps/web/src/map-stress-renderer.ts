import { Application, Container, Graphics, Text } from "pixi.js";
import {
  STRESS_MAP_BY_KEY,
  STRESS_MAP_CELLS,
  STRESS_MAP_HEIGHT,
  STRESS_MAP_WIDTH,
  type StressMapCell,
  type StressMapCellData,
  type StressTerrain,
} from "./map-stress-data.js";

export interface StressMapRendererOptions {
  readonly showGrid: boolean;
  readonly showCoordinates: boolean;
  readonly selected: StressMapCell;
}

interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

interface DisplayCell extends ScreenPoint {
  readonly depth: number;
}

const TILE_WIDTH = 84;
const TILE_HEIGHT = 42;
const ELEVATION_STEP = 24;
const PADDING = 90;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 2.4;
const ZOOM_STEP = 1.16;
const DRAG_THRESHOLD = 5;

function key(cell: StressMapCell): string {
  return `${cell.x},${cell.y}`;
}

function rotatedCell(cell: StressMapCell, rotation: number): StressMapCell {
  switch (rotation) {
    case 1:
      return { x: cell.y, y: STRESS_MAP_WIDTH - 1 - cell.x };
    case 2:
      return { x: STRESS_MAP_WIDTH - 1 - cell.x, y: STRESS_MAP_HEIGHT - 1 - cell.y };
    case 3:
      return { x: STRESS_MAP_HEIGHT - 1 - cell.y, y: cell.x };
    default:
      return cell;
  }
}

function projection(cell: StressMapCell, elevation: number, rotation: number): DisplayCell {
  const display = rotatedCell(cell, rotation);
  return {
    x: (display.x - display.y) * (TILE_WIDTH / 2),
    y: (display.x + display.y) * (TILE_HEIGHT / 2) - elevation * ELEVATION_STEP,
    depth: display.x + display.y,
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

function terrainFill(terrain: StressTerrain, elevation: number): number {
  switch (terrain) {
    case "basin":
      return 0x334c58;
    case "road":
      return 0x766849;
    case "forest":
      return 0x29452d;
    case "ridge":
      return 0x65704d;
    case "plateau":
      return 0x7b7651;
    default:
      return elevation < 0 ? 0x425847 : 0x526746;
  }
}

function wallColors(elevation: number): readonly [number, number] {
  if (elevation < 0) return [0x243842, 0x1e3038];
  return [0x4b4934, 0x3b3d2e];
}

function drawAbsoluteElevationWalls(
  world: Container,
  cell: StressMapCellData,
  point: ScreenPoint,
  rotation: number,
): void {
  if (cell.elevation === 0) return;
  const baseline = projection(cell, 0, rotation);
  const topY = Math.min(point.y, baseline.y);
  const bottomY = Math.max(point.y, baseline.y);
  const [leftFill, rightFill] = wallColors(cell.elevation);
  world.addChild(
    new Graphics()
      .poly([
        point.x - TILE_WIDTH / 2,
        point.y,
        point.x,
        point.y + TILE_HEIGHT / 2,
        baseline.x,
        bottomY + TILE_HEIGHT / 2,
        baseline.x - TILE_WIDTH / 2,
        baseline.y,
      ])
      .fill({ color: leftFill, alpha: cell.elevation < 0 ? 0.82 : 0.94 })
      .stroke({ color: 0x77704b, width: 0.8, alpha: 0.42 }),
    new Graphics()
      .poly([
        point.x + TILE_WIDTH / 2,
        point.y,
        point.x,
        point.y + TILE_HEIGHT / 2,
        baseline.x,
        bottomY + TILE_HEIGHT / 2,
        baseline.x + TILE_WIDTH / 2,
        baseline.y,
      ])
      .fill({ color: rightFill, alpha: cell.elevation < 0 ? 0.82 : 0.94 })
      .stroke({ color: 0x625f43, width: 0.8, alpha: 0.4 }),
  );
  void topY;
}

function drawTerrainDetail(world: Container, cell: StressMapCellData, point: ScreenPoint): void {
  if (cell.terrain === "road") {
    world.addChild(
      new Graphics()
        .moveTo(point.x - 24, point.y + 4)
        .lineTo(point.x + 20, point.y - 3)
        .moveTo(point.x - 14, point.y - 6)
        .lineTo(point.x + 23, point.y + 2)
        .stroke({ color: 0xa49165, width: 1.4, alpha: 0.3 }),
    );
    return;
  }
  if (cell.terrain === "forest" && cell.blocked) {
    world.addChild(
      new Graphics()
        .circle(point.x - 5, point.y - 13, 9)
        .circle(point.x + 6, point.y - 15, 10)
        .circle(point.x + 1, point.y - 23, 10)
        .fill(0x223b28)
        .stroke({ color: 0x17281c, width: 1.2, alpha: 0.9 }),
    );
    return;
  }
  if (cell.terrain === "basin") {
    world.addChild(
      new Graphics().ellipse(point.x, point.y + 1, 23, 6).fill({ color: 0x7aa7b5, alpha: 0.12 }),
    );
  }
}

export class StressMapRenderer {
  readonly #host: HTMLElement;
  readonly #onSelect: (cell: StressMapCell) => void;
  readonly #app = new Application();
  #ready = false;
  #resizeObserver: ResizeObserver | undefined;
  #options: StressMapRendererOptions;
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
    options: StressMapRendererOptions,
    onSelect: (cell: StressMapCell) => void,
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
    const canvas = this.#app.canvas;
    canvas.dataset.testid = "stress-map-2p5d-canvas";
    canvas.setAttribute("aria-label", "Large battlefield extreme elevation renderer stress map");
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

  update(options: StressMapRendererOptions): void {
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

  #draw(): void {
    if (!this.#ready) return;
    this.#updateCameraDataset();
    this.#app.stage.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });

    const cells = STRESS_MAP_CELLS.map((cell) => ({
      cell,
      point: projection(cell, cell.elevation, this.#rotation),
    }));
    const xs = cells.flatMap(({ point }) => [point.x - TILE_WIDTH / 2, point.x + TILE_WIDTH / 2]);
    const ys = cells.flatMap(({ cell, point }) => {
      const baseline = projection(cell, 0, this.#rotation);
      return [
        Math.min(point.y, baseline.y) - 52,
        Math.max(point.y, baseline.y) + TILE_HEIGHT / 2 + 20,
      ];
    });
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
        0.2,
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
      return depth !== 0 ? depth : left.cell.elevation - right.cell.elevation;
    });

    for (const { cell, point } of sorted) {
      drawAbsoluteElevationWalls(world, cell, point, this.#rotation);
      const selected = key(cell) === key(this.#options.selected);
      const tile = new Graphics()
        .poly(tilePoints(point))
        .fill({ color: terrainFill(cell.terrain, cell.elevation), alpha: 1 })
        .stroke({
          color: selected ? 0xf1d795 : this.#options.showGrid ? 0xa9aa87 : 0x465541,
          width: selected ? 2.4 : this.#options.showGrid ? 0.8 : 0.3,
          alpha: selected ? 0.98 : this.#options.showGrid ? 0.5 : 0.22,
        });
      tile.eventMode = "static";
      tile.cursor = "pointer";
      tile.on("pointertap", () => {
        if (!this.#suppressTap) this.#onSelect(cell);
      });
      world.addChild(tile);
      drawTerrainDetail(world, cell, point);

      if (this.#options.showCoordinates) {
        const coordinate = new Text({
          text: `${cell.x},${cell.y} ${cell.elevation >= 0 ? "+" : ""}${cell.elevation}`,
          style: {
            fill: 0xf4efe5,
            fontFamily: "ui-monospace, monospace",
            fontSize: 7,
            fontWeight: "700",
            stroke: { color: 0x10150f, width: 2 },
          },
        });
        coordinate.anchor.set(0.5);
        coordinate.position.set(point.x, point.y + 1);
        world.addChild(coordinate);
      }
    }

    this.#host.dataset.cellCount = String(STRESS_MAP_CELLS.length);
    this.#host.dataset.minElevation = String(
      Math.min(...STRESS_MAP_CELLS.map((cell) => cell.elevation)),
    );
    this.#host.dataset.maxElevation = String(
      Math.max(...STRESS_MAP_CELLS.map((cell) => cell.elevation)),
    );
    this.#host.dataset.selectedElevation = String(
      STRESS_MAP_BY_KEY.get(key(this.#options.selected))?.elevation ?? 0,
    );
  }
}
