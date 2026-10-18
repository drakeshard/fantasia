import { Application, Container, Graphics, Text } from "pixi.js";
import {
  STRESS_BOUNDS,
  STRESS_CELL_COUNT,
  STRESS_MAX_ELEVATION,
  STRESS_MIN_ELEVATION,
  type StressCell,
  stressElevationAt,
  stressSignedElevation,
} from "./map-stress-data.js";

export interface MapStressRendererOptions {
  readonly showGrid: boolean;
  readonly showCoordinates: boolean;
  readonly selected: StressCell;
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
const PADDING = 84;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.6;
const ZOOM_STEP = 1.16;
const DRAG_THRESHOLD = 5;

function key(cell: StressCell): string {
  return `${cell.x},${cell.y}`;
}

function isInside(cell: StressCell): boolean {
  return (
    cell.x >= STRESS_BOUNDS.minX &&
    cell.x <= STRESS_BOUNDS.maxX &&
    cell.y >= STRESS_BOUNDS.minY &&
    cell.y <= STRESS_BOUNDS.maxY
  );
}

function rotatedCell(cell: StressCell, rotation: number): StressCell {
  const x = cell.x - STRESS_BOUNDS.minX;
  const y = cell.y - STRESS_BOUNDS.minY;
  const width = STRESS_BOUNDS.maxX - STRESS_BOUNDS.minX;
  const height = STRESS_BOUNDS.maxY - STRESS_BOUNDS.minY;
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

function projection(cell: StressCell, elevation: number, rotation: number): DisplayCell {
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

function visibleNeighborDirections(rotation: number): readonly StressCell[] {
  switch (rotation) {
    case 1:
      return [
        { x: 0, y: 1 },
        { x: -1, y: 0 },
      ];
    case 2:
      return [
        { x: -1, y: 0 },
        { x: 0, y: -1 },
      ];
    case 3:
      return [
        { x: 0, y: -1 },
        { x: 1, y: 0 },
      ];
    default:
      return [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
      ];
  }
}

function terrainFill(elevation: number, cell: StressCell): number {
  const checker = (cell.x + cell.y) % 2 === 0;
  if (elevation >= 5) return checker ? 0x7b7650 : 0x716d49;
  if (elevation >= 2) return checker ? 0x65704d : 0x5e6847;
  if (elevation >= 0) return checker ? 0x4f6647 : 0x485f42;
  if (elevation >= -3) return checker ? 0x3f5c4b : 0x395446;
  if (elevation >= -5) return checker ? 0x344c50 : 0x30464a;
  return checker ? 0x293b48 : 0x263641;
}

function drawVisibleFaces(
  world: Container,
  cell: StressCell,
  point: ScreenPoint,
  elevation: number,
  rotation: number,
): number {
  const directions = visibleNeighborDirections(rotation);
  let maxDrop = 0;

  directions.forEach((direction, index) => {
    const neighbor = { x: cell.x + direction.x, y: cell.y + direction.y };
    if (!isInside(neighbor)) return;
    const neighborElevation = stressElevationAt(neighbor);
    const drop = elevation - neighborElevation;
    if (drop <= 0) return;
    maxDrop = Math.max(maxDrop, drop);
    const vertical = drop * ELEVATION_STEP;

    if (index === 0) {
      world.addChild(
        new Graphics()
          .poly([
            point.x + TILE_WIDTH / 2,
            point.y,
            point.x,
            point.y + TILE_HEIGHT / 2,
            point.x,
            point.y + TILE_HEIGHT / 2 + vertical,
            point.x + TILE_WIDTH / 2,
            point.y + vertical,
          ])
          .fill(0x3a3b35)
          .stroke({ color: 0x777363, width: 0.8, alpha: 0.65 }),
      );
    } else {
      world.addChild(
        new Graphics()
          .poly([
            point.x,
            point.y + TILE_HEIGHT / 2,
            point.x - TILE_WIDTH / 2,
            point.y,
            point.x - TILE_WIDTH / 2,
            point.y + vertical,
            point.x,
            point.y + TILE_HEIGHT / 2 + vertical,
          ])
          .fill(0x303630)
          .stroke({ color: 0x68695b, width: 0.8, alpha: 0.62 }),
      );
    }
  });

  return maxDrop;
}

export class MapStressRenderer {
  readonly #host: HTMLElement;
  readonly #onSelect: (cell: StressCell) => void;
  readonly #app = new Application();
  #ready = false;
  #resizeObserver: ResizeObserver | undefined;
  #options: MapStressRendererOptions;
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
    options: MapStressRendererOptions,
    onSelect: (cell: StressCell) => void,
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
    canvas.setAttribute("aria-label", "Large signed-elevation 2.5D terrain stress review");
    canvas.style.touchAction = "none";
    this.#host.replaceChildren(canvas);
    this.#host.dataset.mapCellCount = String(STRESS_CELL_COUNT);
    this.#host.dataset.elevationMin = String(STRESS_MIN_ELEVATION);
    this.#host.dataset.elevationMax = String(STRESS_MAX_ELEVATION);
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

  update(options: MapStressRendererOptions): void {
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

  #updateCameraDataset(): void {
    this.#host.dataset.cameraRotation = String(this.#rotation * 90);
    this.#host.dataset.cameraZoom = this.#zoom.toFixed(2);
    this.#host.dataset.cameraPan = `${Math.round(this.#panX)},${Math.round(this.#panY)}`;
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

  #draw(): void {
    if (!this.#ready) return;
    this.#updateCameraDataset();
    this.#app.stage.removeChildren().forEach((child) => child.destroy({ children: true }));

    const cells: Array<{ cell: StressCell; elevation: number; point: DisplayCell }> = [];
    for (let y = STRESS_BOUNDS.minY; y <= STRESS_BOUNDS.maxY; y += 1) {
      for (let x = STRESS_BOUNDS.minX; x <= STRESS_BOUNDS.maxX; x += 1) {
        const cell = { x, y };
        const elevation = stressElevationAt(cell);
        cells.push({ cell, elevation, point: projection(cell, elevation, this.#rotation) });
      }
    }

    const directions = visibleNeighborDirections(this.#rotation);
    const xs = cells.flatMap(({ point }) => [point.x - TILE_WIDTH / 2, point.x + TILE_WIDTH / 2]);
    const ys = cells.flatMap(({ cell, elevation, point }) => {
      let maxDrop = 0;
      for (const direction of directions) {
        const neighbor = { x: cell.x + direction.x, y: cell.y + direction.y };
        if (!isInside(neighbor)) continue;
        maxDrop = Math.max(maxDrop, elevation - stressElevationAt(neighbor));
      }
      return [point.y - TILE_HEIGHT / 2 - 18, point.y + TILE_HEIGHT / 2 + maxDrop * ELEVATION_STEP];
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
      1.2,
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
      return depth !== 0 ? depth : left.elevation - right.elevation;
    });

    for (const { cell, elevation, point } of sorted) {
      drawVisibleFaces(world, cell, point, elevation, this.#rotation);
      const selected = key(cell) === key(this.#options.selected);
      const tile = new Graphics()
        .poly(tilePoints(point))
        .fill({ color: terrainFill(elevation, cell), alpha: 1 })
        .stroke({
          color: selected ? 0xf1d795 : this.#options.showGrid ? 0xa7aa92 : 0x526052,
          width: selected ? 2.5 : this.#options.showGrid ? 0.9 : 0.35,
          alpha: selected ? 0.98 : this.#options.showGrid ? 0.55 : 0.3,
        });
      tile.eventMode = "static";
      tile.cursor = "pointer";
      tile.on("pointertap", () => {
        if (!this.#suppressTap) this.#onSelect(cell);
      });
      world.addChild(tile);

      if (this.#options.showCoordinates) {
        const coordinate = new Text({
          text: `${cell.x},${cell.y} ${stressSignedElevation(elevation)}`,
          style: {
            fill: 0xfff7e7,
            fontFamily: "ui-monospace, monospace",
            fontSize: 7,
            fontWeight: "700",
            stroke: { color: 0x0a1014, width: 2 },
          },
        });
        coordinate.anchor.set(0.5);
        coordinate.position.set(point.x, point.y + 1);
        world.addChild(coordinate);
      }
    }
  }
}
