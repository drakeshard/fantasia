import { Application, Container, Graphics, Text } from "pixi.js";
import type { BattlefieldRenderScene, BattlefieldUnitMarker } from "./battlefield-scene.js";
import {
  FANTASIA_BATTLEFIELD_RENDER_PROFILE,
  FANTASIA_BATTLEFIELD_VISUAL_CATALOG,
  type BattlefieldCellCoord,
  type BattlefieldProjectedCell,
  type BattlefieldScreenPoint,
  type BattlefieldTerrainVisualId,
  projectSquareCell,
  squareTilePoints,
  terrainVisualForCell,
  visibleSquareNeighbors,
} from "./battlefield-presentation.js";

export type MapReviewCell = BattlefieldCellCoord;
export type MapReviewRendererScene = BattlefieldRenderScene;

export interface MapReviewRendererOptions {
  readonly showGrid: boolean;
  readonly showCoordinates: boolean;
  readonly showRoute: boolean;
  readonly showUnits: boolean;
  readonly selected: MapReviewCell;
}

const PROFILE = FANTASIA_BATTLEFIELD_RENDER_PROFILE;
const CATALOG = FANTASIA_BATTLEFIELD_VISUAL_CATALOG;

function key(cell: MapReviewCell): string {
  return `${cell.x},${cell.y}`;
}

function drawElevationWalls(
  world: Container,
  point: BattlefieldScreenPoint,
  leftDrop: number,
  rightDrop: number,
): number {
  let faces = 0;
  if (leftDrop > 0) {
    const baseY = point.y + leftDrop * PROFILE.elevationStep;
    world.addChild(
      new Graphics()
        .poly([
          point.x - PROFILE.tileWidth / 2,
          point.y,
          point.x,
          point.y + PROFILE.tileHeight / 2,
          point.x,
          baseY + PROFILE.tileHeight / 2,
          point.x - PROFILE.tileWidth / 2,
          baseY,
        ])
        .fill(0x3f412d)
        .stroke({ color: 0x77704b, width: 1, alpha: 0.65 }),
    );
    faces += 1;
  }
  if (rightDrop > 0) {
    const baseY = point.y + rightDrop * PROFILE.elevationStep;
    world.addChild(
      new Graphics()
        .poly([
          point.x + PROFILE.tileWidth / 2,
          point.y,
          point.x,
          point.y + PROFILE.tileHeight / 2,
          point.x,
          baseY + PROFILE.tileHeight / 2,
          point.x + PROFILE.tileWidth / 2,
          baseY,
        ])
        .fill(0x343829)
        .stroke({ color: 0x625f43, width: 1, alpha: 0.62 }),
    );
    faces += 1;
  }
  return faces;
}

function drawTree(world: Container, point: BattlefieldScreenPoint, seed: number): void {
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

function drawRubble(world: Container, point: BattlefieldScreenPoint): void {
  world.addChild(
    new Graphics()
      .poly([
        point.x - 18,
        point.y + 5,
        point.x - 9,
        point.y - 8,
        point.x + 2,
        point.y - 5,
        point.x + 7,
        point.y + 7,
      ])
      .fill(0x3c3b33)
      .stroke({ color: 0x766d58, width: 1 }),
    new Graphics()
      .poly([
        point.x + 3,
        point.y + 8,
        point.x + 12,
        point.y - 5,
        point.x + 22,
        point.y + 4,
        point.x + 14,
        point.y + 11,
      ])
      .fill(0x514c3f)
      .stroke({ color: 0x776d59, width: 1 }),
  );
}

function drawBlockedProp(
  world: Container,
  point: BattlefieldScreenPoint,
  seed: number,
  visualId: BattlefieldRenderScene["blockedPropVisualId"],
): void {
  if (CATALOG.props[visualId].fallback === "rubble") drawRubble(world, point);
  else drawTree(world, point, seed);
}

function drawRoadDetail(world: Container, point: BattlefieldScreenPoint): void {
  world.addChild(
    new Graphics()
      .moveTo(point.x - 22, point.y + 5)
      .lineTo(point.x + 18, point.y - 3)
      .moveTo(point.x - 11, point.y - 6)
      .lineTo(point.x + 24, point.y + 2)
      .stroke({ color: 0x9a8961, width: 1.5, alpha: 0.35 }),
  );
}

function drawFieldDetail(world: Container, point: BattlefieldScreenPoint, seed: number): void {
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
  point: BattlefieldScreenPoint,
  unit: BattlefieldUnitMarker,
): void {
  const visual = CATALOG.units[unit.visualId];
  const body = new Graphics()
    .poly([-12, -12, 0, -21, 12, -12, 10, 12, 0, 17, -10, 12])
    .fill({ color: visual.fill, alpha: visual.alpha })
    .stroke({ color: visual.stroke, width: visual.alpha < 0.8 ? 2 : 1.5 });
  body.position.set(point.x, point.y - 22);
  const text = new Text({
    text: unit.label,
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

function drawCart(world: Container, point: BattlefieldScreenPoint): void {
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
  readonly #terrainVisuals: ReadonlyMap<string, BattlefieldTerrainVisualId>;
  readonly #app = new Application();
  #ready = false;
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
  #mouseDragging = false;
  #dragged = false;
  #suppressTap = false;
  #tapTimer: number | undefined;
  #world: Container | undefined;
  #fitScale = 1;
  #contentWidth = 1;
  #contentHeight = 1;
  #minX = 0;
  #minY = 0;
  #lastWidth = 0;
  #lastHeight = 0;

  constructor(
    host: HTMLElement,
    options: MapReviewRendererOptions,
    onSelect: (cell: MapReviewCell) => void,
    scene: MapReviewRendererScene,
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
    const terrainVisuals = new Map<string, BattlefieldTerrainVisualId>();
    for (const region of scene.terrainRegions) {
      for (const cell of region.cells) terrainVisuals.set(key(cell), region.visualId);
    }
    this.#terrainVisuals = terrainVisuals;
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
    canvas.addEventListener("mousedown", this.#handleMouseDown);
    window.addEventListener("mousemove", this.#handleMouseMove);
    window.addEventListener("mouseup", this.#handleMouseUp);
    window.addEventListener("resize", this.#handleResize);
    this.#ready = true;
    this.#resize();
  }

  update(options: MapReviewRendererOptions): void {
    this.#options = options;
    if (this.#ready) this.#draw();
  }

  zoomIn(): void {
    this.#setZoom(this.#zoom * PROFILE.zoomStep);
  }

  zoomOut(): void {
    this.#setZoom(this.#zoom / PROFILE.zoomStep);
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
    window.removeEventListener("resize", this.#handleResize);
    window.removeEventListener("mousemove", this.#handleMouseMove);
    window.removeEventListener("mouseup", this.#handleMouseUp);
    if (this.#tapTimer !== undefined) window.clearTimeout(this.#tapTimer);
    if (!this.#ready) return;
    const canvas = this.#app.canvas;
    canvas.removeEventListener("wheel", this.#handleWheel);
    canvas.removeEventListener("pointerdown", this.#handlePointerDown);
    canvas.removeEventListener("pointermove", this.#handlePointerMove);
    canvas.removeEventListener("pointerup", this.#handlePointerUp);
    canvas.removeEventListener("pointercancel", this.#handlePointerUp);
    canvas.removeEventListener("mousedown", this.#handleMouseDown);
    this.#app.destroy(true, { children: true });
    this.#ready = false;
  }

  readonly #handleResize = (): void => this.#resize();

  readonly #handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.#setZoom(this.#zoom * (event.deltaY < 0 ? PROFILE.zoomStep : 1 / PROFILE.zoomStep));
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
    this.#continueDrag(event.clientX, event.clientY);
  };

  readonly #handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    if (this.#app.canvas.hasPointerCapture(event.pointerId)) {
      this.#app.canvas.releasePointerCapture(event.pointerId);
    }
    this.#pointerId = undefined;
    this.#finishDrag();
  };

  readonly #handleMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || this.#pointerId !== undefined) return;
    this.#mouseDragging = true;
    this.#pointerStartX = event.clientX;
    this.#pointerStartY = event.clientY;
    this.#lastPointerX = event.clientX;
    this.#lastPointerY = event.clientY;
    this.#dragged = false;
  };

  readonly #handleMouseMove = (event: MouseEvent): void => {
    if (!this.#mouseDragging) return;
    this.#continueDrag(event.clientX, event.clientY);
  };

  readonly #handleMouseUp = (): void => {
    if (!this.#mouseDragging) return;
    this.#mouseDragging = false;
    this.#finishDrag();
  };

  #continueDrag(clientX: number, clientY: number): void {
    const fromStart = Math.hypot(clientX - this.#pointerStartX, clientY - this.#pointerStartY);
    if (!this.#dragged && fromStart < PROFILE.dragThreshold) return;
    this.#dragged = true;
    this.#suppressTap = true;
    this.#panX += clientX - this.#lastPointerX;
    this.#panY += clientY - this.#lastPointerY;
    this.#lastPointerX = clientX;
    this.#lastPointerY = clientY;
    this.#applyCamera();
  }

  #finishDrag(): void {
    if (this.#dragged) {
      if (this.#tapTimer !== undefined) window.clearTimeout(this.#tapTimer);
      this.#tapTimer = window.setTimeout(() => {
        this.#suppressTap = false;
      }, 80);
    }
    this.#dragged = false;
  }

  #setZoom(next: number): void {
    this.#zoom = Math.min(PROFILE.maxZoom, Math.max(PROFILE.minZoom, next));
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
      (PROFILE.padding - this.#minX) * scale +
      this.#panX;
    world.y =
      (this.#app.screen.height - this.#contentHeight * scale) / 2 +
      (PROFILE.padding - this.#minY) * scale +
      this.#panY;
  }

  #resize(): void {
    if (!this.#ready) return;
    const bounds = this.#host.getBoundingClientRect();
    const width = Math.max(320, Math.floor(bounds.width));
    const height = Math.max(240, Math.floor(bounds.height));
    if (width === this.#lastWidth && height === this.#lastHeight) return;
    this.#lastWidth = width;
    this.#lastHeight = height;
    this.#app.renderer.resize(width, height);
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
    this.#app.stage.removeChildren().forEach((child) => child.destroy({ children: true }));

    const cells: Array<{
      cell: MapReviewCell;
      elevation: number;
      point: BattlefieldProjectedCell;
    }> = [];
    for (let y = this.#scene.bounds.minY; y <= this.#scene.bounds.maxY; y += 1) {
      for (let x = this.#scene.bounds.minX; x <= this.#scene.bounds.maxX; x += 1) {
        const cell = { x, y };
        const elevation = this.#elevationAt(cell);
        cells.push({
          cell,
          elevation,
          point: projectSquareCell(cell, elevation, this.#rotation, this.#scene.bounds),
        });
      }
    }

    const xs = cells.flatMap(({ point }) => [
      point.x - PROFILE.tileWidth / 2,
      point.x + PROFILE.tileWidth / 2,
    ]);
    const ys = cells.flatMap(({ point }) => [point.y - 90, point.y + PROFILE.tileHeight / 2 + 12]);
    this.#minX = Math.min(...xs);
    this.#minY = Math.min(...ys);
    this.#contentWidth = Math.max(...xs) - this.#minX + PROFILE.padding * 2;
    this.#contentHeight = Math.max(...ys) - this.#minY + PROFILE.padding * 2;
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
      const neighbors = visibleSquareNeighbors(cell, this.#rotation);
      const leftDrop = Math.max(0, elevation - this.#elevationAt(neighbors.left));
      const rightDrop = Math.max(0, elevation - this.#elevationAt(neighbors.right));
      elevationFaceCount += drawElevationWalls(world, point, leftDrop, rightDrop);

      const material = terrainVisualForCell(
        this.#terrainVisuals.get(cellKey) ?? "terrain.grass",
        cell,
      );
      const tile = new Graphics()
        .poly(squareTilePoints(point))
        .fill({ color: material.resolvedFill, alpha: 1 })
        .stroke({
          color: this.#options.showGrid ? 0x9c9a79 : material.border,
          width: this.#options.showGrid ? 0.9 : 0.35,
          alpha: this.#options.showGrid ? 0.46 : 0.35,
        });
      tile.eventMode = "static";
      tile.cursor = "pointer";
      tile.on("pointertap", () => {
        if (!this.#suppressTap) this.#onSelect(cell);
      });
      world.addChild(tile);

      if (material.detail === "road") drawRoadDetail(world, point);
      else if (material.detail === "field" && !this.#blocked.has(cellKey)) {
        drawFieldDetail(world, point, cell.x * 31 + cell.y * 17);
      }

      if (this.#options.showRoute && this.#routeClearance.has(cellKey)) {
        world.addChild(
          new Graphics()
            .poly(squareTilePoints(point))
            .fill({ color: 0x82bfd0, alpha: this.#routeAnchors.has(cellKey) ? 0.16 : 0.08 })
            .stroke({ color: 0x9cd9e8, width: 1.2, alpha: 0.62 }),
        );
      }
      if (this.#options.showRoute && this.#exitZone.has(cellKey)) {
        world.addChild(
          new Graphics()
            .poly(squareTilePoints(point))
            .fill({ color: 0x75c8a8, alpha: 0.13 })
            .stroke({ color: 0x8fddbd, width: 2, alpha: 0.88 }),
        );
      }
      if (cellKey === key(this.#options.selected)) {
        world.addChild(
          new Graphics()
            .poly(squareTilePoints(point))
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
      if (this.#blocked.has(key(cell))) {
        drawBlockedProp(
          world,
          point,
          cell.x * 13 + cell.y * 29,
          this.#scene.blockedPropVisualId,
        );
      }
    }

    const elevationValues = cells.map(({ elevation }) => elevation);
    this.#host.dataset.renderedCellCount = String(cells.length);
    this.#host.dataset.elevationMin = String(Math.min(...elevationValues));
    this.#host.dataset.elevationMax = String(Math.max(...elevationValues));
    this.#host.dataset.elevationFaceCount = String(elevationFaceCount);

    if (this.#scene.cartStart) {
      drawCart(
        world,
        projectSquareCell(
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
        projectSquareCell(unit.cell, this.#elevationAt(unit.cell), this.#rotation, this.#scene.bounds),
        unit,
      );
    }
  }
}
