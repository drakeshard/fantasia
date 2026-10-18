import { Application, Container, Graphics, Text } from "pixi.js";
import {
  battlefieldCellKey,
  compileBattlefieldFrame,
  type BattlefieldCompiledFrame,
  type BattlefieldRenderCell,
  type BattlefieldRenderFrame,
  type BattlefieldRenderUnit,
} from "./battlefield-engine.js";
import {
  FANTASIA_BATTLEFIELD_RENDER_PROFILE,
  FANTASIA_BATTLEFIELD_VISUAL_CATALOG,
  type BattlefieldScreenPoint,
  squareTilePoints,
  terrainVisualForCell,
} from "./battlefield-presentation.js";

export interface BattlefieldRendererHostOptions {
  readonly testId: string;
  readonly ariaLabel: string;
  readonly interactiveCamera?: boolean;
  readonly antialias?: boolean;
}

export interface BattlefieldRendererViewOptions {
  readonly selectedCell?: Readonly<{ x: number; y: number }>;
  readonly showGrid?: boolean;
  readonly showCoordinates?: boolean;
  readonly showUnits?: boolean;
}

export interface BattlefieldRendererCallbacks {
  readonly onCellActivate?: (cell: BattlefieldRenderCell) => void;
  readonly onCellPreview?: (cell: BattlefieldRenderCell | undefined) => void;
}

const PROFILE = FANTASIA_BATTLEFIELD_RENDER_PROFILE;
const CATALOG = FANTASIA_BATTLEFIELD_VISUAL_CATALOG;

function drawBlockedProp(world: Container, point: BattlefieldScreenPoint, cell: BattlefieldRenderCell) {
  if (!cell.propVisualId) return;
  const fallback = CATALOG.props[cell.propVisualId].fallback;
  if (fallback === "rubble") {
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
    );
    return;
  }

  world.addChild(
    new Graphics().rect(point.x - 3, point.y - 28, 6, 24).fill(0x5a4530),
    new Graphics()
      .circle(point.x - 6, point.y - 30, 14)
      .circle(point.x + 7, point.y - 32, 15)
      .circle(point.x, point.y - 42, 16)
      .fill(0x315037)
      .stroke({ color: 0x182d20, width: 2, alpha: 0.9 }),
  );
}

function drawUnit(world: Container, point: BattlefieldScreenPoint, unit: BattlefieldRenderUnit): void {
  const visual = CATALOG.units[unit.visualId];
  const y = point.y - PROFILE.tileHeight / 2 - 13;

  world.addChild(
    new Graphics().ellipse(point.x, point.y - PROFILE.tileHeight / 2 + 3, 18, 6).fill({
      color: 0x080b08,
      alpha: unit.defeated ? 0.18 : 0.38,
    }),
  );

  if (unit.selected) {
    world.addChild(
      new Graphics()
        .ellipse(point.x, point.y - PROFILE.tileHeight / 2 + 2, 25, 9)
        .stroke({ color: 0xe7bd63, width: 2, alpha: 0.92 }),
    );
  }

  const body = new Graphics()
    .poly([-13, -15, 0, -23, 13, -15, 11, 13, 0, 19, -11, 13])
    .fill({ color: visual.fill, alpha: unit.defeated ? visual.alpha * 0.45 : visual.alpha })
    .stroke({ color: unit.selected ? 0xf2d48e : visual.stroke, width: unit.selected ? 2.4 : 1.5 });
  body.position.set(point.x, y);
  world.addChild(body);

  if (unit.active && !unit.defeated) {
    const active = new Graphics().poly([-6, 0, 0, -7, 6, 0, 0, -3]).fill(0xe5ca82);
    active.position.set(point.x, y - 31);
    world.addChild(active);
  }

  const label = new Text({
    text: unit.label,
    style: {
      fill: 0xfff7e7,
      fontFamily: "sans-serif",
      fontSize: 10,
      fontWeight: "700",
      stroke: { color: 0x10150f, width: 2 },
    },
  });
  label.anchor.set(0.5);
  label.position.set(point.x, y - 2);
  world.addChild(label);
}

export class BattlefieldRenderer {
  readonly #host: HTMLElement;
  readonly #hostOptions: BattlefieldRendererHostOptions;
  readonly #callbacks: BattlefieldRendererCallbacks;
  readonly #app = new Application();
  #frame: BattlefieldRenderFrame | undefined;
  #compiled: BattlefieldCompiledFrame | undefined;
  #viewOptions: BattlefieldRendererViewOptions = {};
  #ready = false;
  #rotation = 0;
  #zoom = 1;
  #panX = 0;
  #panY = 0;
  #world: Container | undefined;
  #fitScale = 1;
  #contentWidth = 1;
  #contentHeight = 1;
  #minX = 0;
  #minY = 0;
  #pointerId: number | undefined;
  #pointerStartX = 0;
  #pointerStartY = 0;
  #lastPointerX = 0;
  #lastPointerY = 0;
  #dragged = false;
  #resizeObserver: ResizeObserver | undefined;

  constructor(
    host: HTMLElement,
    hostOptions: BattlefieldRendererHostOptions,
    callbacks: BattlefieldRendererCallbacks = {},
  ) {
    this.#host = host;
    this.#hostOptions = hostOptions;
    this.#callbacks = callbacks;
  }

  async init(): Promise<void> {
    await this.#app.init({
      preference: "webgl",
      backgroundAlpha: 0,
      antialias: this.#hostOptions.antialias ?? true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    const canvas = this.#app.canvas;
    canvas.dataset.testid = this.#hostOptions.testId;
    canvas.setAttribute("aria-label", this.#hostOptions.ariaLabel);
    canvas.style.touchAction = "none";
    this.#host.replaceChildren(canvas);
    if (this.#hostOptions.interactiveCamera) {
      canvas.addEventListener("wheel", this.#handleWheel, { passive: false });
      canvas.addEventListener("pointerdown", this.#handlePointerDown);
      canvas.addEventListener("pointermove", this.#handlePointerMove);
      canvas.addEventListener("pointerup", this.#handlePointerUp);
      canvas.addEventListener("pointercancel", this.#handlePointerUp);
    }
    this.#resizeObserver = new ResizeObserver(() => this.#resize());
    this.#resizeObserver.observe(this.#host);
    this.#ready = true;
    this.#resize();
  }

  update(frame: BattlefieldRenderFrame, options: BattlefieldRendererViewOptions = this.#viewOptions): void {
    const frameChanged = this.#frame !== frame;
    this.#frame = frame;
    this.#viewOptions = options;
    if (frameChanged || !this.#compiled) this.#compiled = compileBattlefieldFrame(frame, this.#rotation);
    if (this.#ready) this.#draw();
  }

  setViewOptions(options: BattlefieldRendererViewOptions): void {
    this.#viewOptions = options;
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
    this.#recompileForCamera();
  }

  rotateRight(): void {
    this.#rotation = (this.#rotation + 1) % 4;
    this.#recompileForCamera();
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

  #recompileForCamera(): void {
    if (!this.#frame) return;
    this.#panX = 0;
    this.#panY = 0;
    this.#compiled = compileBattlefieldFrame(this.#frame, this.#rotation);
    if (this.#ready) this.#draw();
  }

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
    const distance = Math.hypot(event.clientX - this.#pointerStartX, event.clientY - this.#pointerStartY);
    if (!this.#dragged && distance < PROFILE.dragThreshold) return;
    this.#dragged = true;
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
  };

  #setZoom(next: number): void {
    this.#zoom = Math.min(PROFILE.maxZoom, Math.max(PROFILE.minZoom, next));
    this.#applyCamera();
  }

  #resize(): void {
    if (!this.#ready) return;
    const width = Math.max(320, Math.floor(this.#host.clientWidth));
    const height = Math.max(240, Math.floor(this.#host.clientHeight));
    this.#app.renderer.resize(width, height);
    this.#draw();
  }

  #applyCamera(): void {
    this.#host.dataset.cameraRotation = String(this.#rotation * 90);
    this.#host.dataset.cameraZoom = this.#zoom.toFixed(2);
    this.#host.dataset.cameraPan = `${Math.round(this.#panX)},${Math.round(this.#panY)}`;
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

  #draw(): void {
    const compiled = this.#compiled;
    if (!compiled || !this.#ready) return;
    this.#app.stage.removeChildren().forEach((child) => child.destroy({ children: true }));

    const xs = compiled.orderedCells.flatMap(({ point }) => [
      point.x - PROFILE.tileWidth / 2,
      point.x + PROFILE.tileWidth / 2,
    ]);
    const ys = compiled.orderedCells.flatMap(({ point }) => [point.y - 90, point.y + PROFILE.tileHeight / 2 + 12]);
    this.#minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    this.#minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    this.#contentWidth = maxX - this.#minX + PROFILE.padding * 2;
    this.#contentHeight = maxY - this.#minY + PROFILE.padding * 2;
    this.#fitScale = Math.min(
      1.35,
      Math.max(
        0.32,
        Math.min(this.#app.screen.width / this.#contentWidth, this.#app.screen.height / this.#contentHeight),
      ),
    );

    const world = new Container();
    this.#world = world;
    this.#app.stage.addChild(world);
    this.#applyCamera();

    const selectedKey = this.#viewOptions.selectedCell
      ? battlefieldCellKey(this.#viewOptions.selectedCell)
      : undefined;

    for (const { cell, point } of compiled.orderedCells) {
      const visual = terrainVisualForCell(cell.terrainVisualId, cell);
      const tile = new Graphics()
        .poly(squareTilePoints(point))
        .fill({ color: visual.resolvedFill, alpha: cell.blocked ? 0.94 : 1 })
        .stroke({
          color: cell.path ? 0xd3aa58 : cell.reachable ? 0x8da982 : visual.border,
          width: cell.path ? 2.2 : cell.reachable ? 1.7 : this.#viewOptions.showGrid ? 1 : 0.55,
          alpha: cell.path || cell.reachable || this.#viewOptions.showGrid ? 0.9 : 0.52,
        });
      tile.eventMode = cell.blocked ? "none" : "static";
      tile.cursor = cell.blocked ? "default" : "pointer";
      tile.on("pointertap", () => {
        if (!this.#dragged) this.#callbacks.onCellActivate?.(cell);
      });
      tile.on("pointerover", () => this.#callbacks.onCellPreview?.(cell));
      tile.on("pointerout", () => this.#callbacks.onCellPreview?.(undefined));
      world.addChild(tile);

      if (battlefieldCellKey(cell) === selectedKey) {
        world.addChild(
          new Graphics()
            .poly(squareTilePoints(point))
            .stroke({ color: 0xf2d48e, width: 3, alpha: 0.95 }),
        );
      }

      if (cell.reachable && !compiled.unitByCellKey.has(battlefieldCellKey(cell))) {
        world.addChild(
          new Graphics()
            .ellipse(point.x, point.y + 1, 9, 4)
            .fill({ color: cell.path ? 0xd6ad5d : 0x9bb58d, alpha: cell.path ? 0.55 : 0.28 }),
        );
      }

      if (cell.blocked) drawBlockedProp(world, point, cell);

      if (this.#viewOptions.showCoordinates) {
        const coordinate = new Text({
          text: `${cell.x},${cell.y}`,
          style: { fill: 0xe5ddc7, fontSize: 8, fontFamily: "sans-serif" },
        });
        coordinate.anchor.set(0.5);
        coordinate.position.set(point.x, point.y + 1);
        world.addChild(coordinate);
      } else if (cell.reachableCost !== undefined && !compiled.unitByCellKey.has(battlefieldCellKey(cell))) {
        const cost = new Text({
          text: String(cell.reachableCost),
          style: {
            fill: 0xdce3cb,
            fontSize: 8,
            fontFamily: "sans-serif",
            fontWeight: "700",
            stroke: { color: 0x273022, width: 2 },
          },
        });
        cost.anchor.set(0.5);
        cost.position.set(point.x, point.y + 1);
        world.addChild(cost);
      }
    }

    if (this.#viewOptions.showUnits !== false) {
      for (const { cell, point } of compiled.orderedCells) {
        const unit = compiled.unitByCellKey.get(battlefieldCellKey(cell));
        if (unit) drawUnit(world, point, unit);
      }
    }

    this.#host.dataset.renderedCellCount = String(compiled.stats.cellCount);
    this.#host.dataset.renderedUnitCount = String(compiled.stats.unitCount);
    this.#host.dataset.sceneId = compiled.source.id;
  }
}
