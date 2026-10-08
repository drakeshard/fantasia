import type { ProductionBattleCellView, ProductionBattleView } from "@fantasia/runtime";
import { Application, Container, Graphics, Text } from "pixi.js";

export interface BattleRendererCallbacks {
  readonly onCellActivate: (cell: ProductionBattleCellView) => void;
  readonly onCellPreview: (cell: ProductionBattleCellView | undefined) => void;
}

interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

const TILE_WIDTH = 84;
const TILE_HEIGHT = 42;
const ELEVATION_STEP = 24;
const UNIT_RADIUS = 18;
const PADDING = 44;

function projection(cell: Pick<ProductionBattleCellView, "x" | "y" | "elevation">): ScreenPoint {
  return {
    x: (cell.x - cell.y) * (TILE_WIDTH / 2),
    y: (cell.x + cell.y) * (TILE_HEIGHT / 2) - cell.elevation * ELEVATION_STEP,
  };
}

function tilePoints(center: ScreenPoint): number[] {
  return [
    center.x,
    center.y - TILE_HEIGHT / 2,
    center.x + TILE_WIDTH / 2,
    center.y,
    center.x,
    center.y + TILE_HEIGHT / 2,
    center.x - TILE_WIDTH / 2,
    center.y,
  ];
}

function fillFor(cell: ProductionBattleCellView): number {
  if (cell.blocked) return 0x242b36;
  if (cell.path) return 0x315f94;
  if (cell.reachable) return 0x284d73;
  if (cell.elevation >= 2) return 0x4d3e68;
  if (cell.elevation === 1) return 0x3c3d5a;
  return 0x27374c;
}

function borderFor(cell: ProductionBattleCellView): number {
  if (cell.path) return 0xa8d2ff;
  if (cell.reachable) return 0x6aa9ee;
  if (cell.blocked) return 0x596474;
  return 0x526b88;
}

function actorColors(side: "player" | "enemy", selected: boolean, active: boolean) {
  if (selected) return { fill: 0xd2a843, stroke: 0xffe8a0 };
  if (active) return { fill: 0x4c8bd6, stroke: 0xb5dcff };
  return side === "player"
    ? { fill: 0x355c89, stroke: 0x9bc7f3 }
    : { fill: 0x8b4a52, stroke: 0xf0afb5 };
}

export class ProductionBattleRenderer {
  readonly #host: HTMLElement;
  readonly #callbacks: BattleRendererCallbacks;
  readonly #app = new Application();
  #view: ProductionBattleView | undefined;
  #resizeObserver: ResizeObserver | undefined;
  #ready = false;

  constructor(host: HTMLElement, callbacks: BattleRendererCallbacks) {
    this.#host = host;
    this.#callbacks = callbacks;
  }

  async init(): Promise<void> {
    await this.#app.init({
      preference: "webgl",
      backgroundAlpha: 0,
      antialias: false,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });
    this.#app.canvas.dataset.testid = "production-battlefield-canvas";
    this.#app.canvas.setAttribute("aria-label", "Production tactical battlefield renderer");
    this.#host.replaceChildren(this.#app.canvas);
    this.#ready = true;

    this.#resizeObserver = new ResizeObserver(() => this.#resize());
    this.#resizeObserver.observe(this.#host);
    this.#resize();
  }

  update(view: ProductionBattleView): void {
    this.#view = view;
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
    const width = Math.max(320, Math.floor(this.#host.clientWidth));
    const height = Math.max(360, Math.floor(this.#host.clientHeight));
    this.#app.renderer.resize(width, height);
    this.#draw();
  }

  #draw(): void {
    const view = this.#view;
    if (!view) return;
    this.#app.stage.removeChildren().forEach((child) => {
      child.destroy({ children: true });
    });

    const projected = view.cells.map((cell) => ({ cell, point: projection(cell) }));
    const xs = projected.flatMap(({ point }) => [
      point.x - TILE_WIDTH / 2,
      point.x + TILE_WIDTH / 2,
    ]);
    const ys = projected.flatMap(({ point }) => [
      point.y - TILE_HEIGHT / 2,
      point.y + TILE_HEIGHT / 2,
    ]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys) - UNIT_RADIUS * 2;
    const maxY = Math.max(...ys);
    const contentWidth = maxX - minX + PADDING * 2;
    const contentHeight = maxY - minY + PADDING * 2;
    const scale = Math.min(
      1.35,
      Math.max(
        0.52,
        Math.min(this.#app.screen.width / contentWidth, this.#app.screen.height / contentHeight),
      ),
    );

    const world = new Container();
    world.scale.set(scale);
    world.x = (this.#app.screen.width - contentWidth * scale) / 2 + (PADDING - minX) * scale;
    world.y = (this.#app.screen.height - contentHeight * scale) / 2 + (PADDING - minY) * scale;
    this.#app.stage.addChild(world);

    const sortedCells = [...projected].sort((left, right) => {
      const depth = left.cell.x + left.cell.y - (right.cell.x + right.cell.y);
      if (depth !== 0) return depth;
      return left.cell.elevation - right.cell.elevation;
    });

    for (const { cell, point } of sortedCells) {
      const baseY = point.y + cell.elevation * ELEVATION_STEP;
      if (cell.elevation > 0) {
        const wall = new Graphics()
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
          .fill(0x202738);
        world.addChild(wall);
      }

      const tile = new Graphics()
        .poly(tilePoints(point))
        .fill({ color: fillFor(cell), alpha: cell.blocked ? 0.72 : 0.94 })
        .stroke({ color: borderFor(cell), width: cell.path ? 2.4 : 1.2, alpha: 0.92 });
      tile.eventMode = cell.blocked ? "none" : "static";
      tile.cursor = cell.blocked ? "default" : "pointer";
      tile.on("pointertap", () => this.#callbacks.onCellActivate(cell));
      tile.on("pointerover", () => this.#callbacks.onCellPreview(cell));
      tile.on("pointerout", () => this.#callbacks.onCellPreview(undefined));
      world.addChild(tile);

      if (cell.elevation > 0) {
        const label = new Text({
          text: `▲${cell.elevation}`,
          style: { fill: 0xd7c2ef, fontSize: 10, fontFamily: "sans-serif", fontWeight: "700" },
        });
        label.anchor.set(0.5);
        label.position.set(point.x, point.y + 2);
        world.addChild(label);
      } else if (cell.reachableCost !== undefined && cell.occupantActorId === undefined) {
        const label = new Text({
          text: String(cell.reachableCost),
          style: { fill: 0xcfe8ff, fontSize: 10, fontFamily: "sans-serif", fontWeight: "700" },
        });
        label.anchor.set(0.5);
        label.position.set(point.x, point.y + 1);
        world.addChild(label);
      }
    }

    for (const actor of view.actors) {
      const cell = view.cells.find((candidate) => candidate.occupantActorId === actor.id);
      if (!cell) continue;
      const point = projection(cell);
      const colors = actorColors(actor.side, actor.selected, actor.active);
      const unit = new Graphics()
        .circle(0, 0, UNIT_RADIUS)
        .fill({ color: colors.fill, alpha: actor.defeated ? 0.46 : 1 })
        .stroke({ color: colors.stroke, width: actor.selected ? 3 : 2 });
      unit.eventMode = "static";
      unit.cursor = "pointer";
      unit.on("pointertap", () => this.#callbacks.onCellActivate(cell));
      unit.position.set(point.x, point.y - TILE_HEIGHT / 2 - UNIT_RADIUS + 4);
      world.addChild(unit);

      const label = new Text({
        text: actor.shortLabel,
        style: { fill: 0xffffff, fontSize: 11, fontFamily: "sans-serif", fontWeight: "800" },
      });
      label.anchor.set(0.5);
      label.position.copyFrom(unit.position);
      world.addChild(label);
    }
  }
}
