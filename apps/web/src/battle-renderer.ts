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

function terrainFill(cell: ProductionBattleCellView): number {
  if (cell.blocked) return 0x494538;
  if (cell.elevation >= 2) return 0x6d6847;
  if (cell.elevation === 1) return 0x66704b;
  return (cell.x + cell.y) % 2 === 0 ? 0x596748 : 0x526043;
}

function terrainBorder(cell: ProductionBattleCellView): number {
  if (cell.path) return 0xd3aa58;
  if (cell.reachable) return 0x8da982;
  if (cell.blocked) return 0x6e6654;
  return 0x6f765a;
}

function actorColors(side: "player" | "enemy", selected: boolean, active: boolean) {
  if (selected) return { fill: 0xb58a45, stroke: 0xf2d48e, cloth: 0xd6ba78 };
  if (active) return { fill: 0x6f805e, stroke: 0xd7d9a6, cloth: 0xb7c18f };
  return side === "player"
    ? { fill: 0x465c58, stroke: 0xb8c7ad, cloth: 0x819a87 }
    : { fill: 0x6a3d35, stroke: 0xc58c78, cloth: 0xa95c4c };
}

function drawBlockedTerrain(world: Container, point: ScreenPoint): void {
  const rubble = new Graphics();
  rubble
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
    .stroke({ color: 0x766d58, width: 1 });
  rubble
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
    .stroke({ color: 0x776d59, width: 1 });
  world.addChild(rubble);
}

function drawUnitMarker(
  world: Container,
  point: ScreenPoint,
  actor: ProductionBattleView["actors"][number],
): void {
  const colors = actorColors(actor.side, actor.selected, actor.active);
  const anchorY = point.y - TILE_HEIGHT / 2 - UNIT_RADIUS + 5;

  const shadow = new Graphics()
    .ellipse(point.x, point.y - TILE_HEIGHT / 2 + 3, 19, 6)
    .fill({ color: 0x0b0b08, alpha: actor.defeated ? 0.18 : 0.38 });
  world.addChild(shadow);

  if (actor.selected) {
    const selection = new Graphics()
      .ellipse(point.x, point.y - TILE_HEIGHT / 2 + 2, 25, 9)
      .stroke({ color: 0xe7bd63, width: 2, alpha: 0.92 });
    world.addChild(selection);
  }

  const banner = new Graphics()
    .poly([-17, -20, 0, -26, 17, -20, 15, 13, 0, 23, -15, 13])
    .fill({ color: colors.fill, alpha: actor.defeated ? 0.48 : 1 })
    .stroke({ color: colors.stroke, width: actor.selected ? 2.5 : 1.7 });
  banner.position.set(point.x, anchorY);
  banner.eventMode = "static";
  banner.cursor = "pointer";
  world.addChild(banner);

  const cloth = new Graphics()
    .poly([-11, -13, 11, -13, 10, 3, 0, 10, -10, 3])
    .fill({ color: colors.cloth, alpha: actor.defeated ? 0.38 : 0.7 });
  cloth.position.copyFrom(banner.position);
  world.addChild(cloth);

  if (actor.active && !actor.defeated) {
    const turnMark = new Graphics().poly([-6, 0, 0, -7, 6, 0, 0, -3]).fill(0xe5ca82);
    turnMark.position.set(point.x, anchorY - 32);
    world.addChild(turnMark);
  }

  const label = new Text({
    text: actor.shortLabel,
    style: {
      fill: 0xf7ecd2,
      fontSize: 10,
      fontFamily: "Georgia, serif",
      fontWeight: "700",
      stroke: { color: 0x17120c, width: 2 },
    },
  });
  label.anchor.set(0.5);
  label.position.set(point.x, anchorY - 3);
  world.addChild(label);
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
    this.#app.canvas.setAttribute("aria-label", "Fantasia tactical battlefield");
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
        const leftWall = new Graphics()
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
          .fill(cell.elevation >= 2 ? 0x3e3828 : 0x47402d)
          .stroke({ color: 0x5b513a, width: 1, alpha: 0.7 });
        const rightWall = new Graphics()
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
          .fill(cell.elevation >= 2 ? 0x332f24 : 0x3a3528)
          .stroke({ color: 0x514a37, width: 1, alpha: 0.62 });
        world.addChild(leftWall, rightWall);
      }

      const tile = new Graphics()
        .poly(tilePoints(point))
        .fill({ color: terrainFill(cell), alpha: cell.blocked ? 0.94 : 1 })
        .stroke({
          color: terrainBorder(cell),
          width: cell.path ? 2.2 : cell.reachable ? 1.7 : 0.8,
          alpha: cell.path || cell.reachable ? 0.95 : 0.58,
        });
      tile.eventMode = cell.blocked ? "none" : "static";
      tile.cursor = cell.blocked ? "default" : "pointer";
      tile.on("pointertap", () => this.#callbacks.onCellActivate(cell));
      tile.on("pointerover", () => this.#callbacks.onCellPreview(cell));
      tile.on("pointerout", () => this.#callbacks.onCellPreview(undefined));
      world.addChild(tile);

      const groundDetail = new Graphics()
        .moveTo(point.x - 16, point.y + 4)
        .lineTo(point.x - 4, point.y + 9)
        .moveTo(point.x + 8, point.y - 7)
        .lineTo(point.x + 18, point.y - 3)
        .stroke({ color: 0x394331, width: 1, alpha: 0.42 });
      world.addChild(groundDetail);

      if (cell.reachable && !cell.blocked && cell.occupantActorId === undefined) {
        const reachableMark = new Graphics()
          .ellipse(point.x, point.y + 1, 9, 4)
          .fill({ color: cell.path ? 0xd6ad5d : 0x9bb58d, alpha: cell.path ? 0.55 : 0.28 })
          .stroke({ color: cell.path ? 0xe5c477 : 0xb0c2a2, width: 1, alpha: 0.72 });
        world.addChild(reachableMark);
      }

      if (cell.blocked) drawBlockedTerrain(world, point);

      if (cell.elevation > 0) {
        const label = new Text({
          text: `+${cell.elevation}`,
          style: {
            fill: 0xd0c5a6,
            fontSize: 8,
            fontFamily: "sans-serif",
            fontWeight: "700",
            stroke: { color: 0x282219, width: 2 },
          },
        });
        label.anchor.set(0.5);
        label.position.set(point.x + 24, point.y - 1);
        world.addChild(label);
      } else if (cell.reachableCost !== undefined && cell.occupantActorId === undefined) {
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

    for (const actor of view.actors) {
      const cell = view.cells.find((candidate) => candidate.occupantActorId === actor.id);
      if (!cell) continue;
      drawUnitMarker(world, projection(cell), actor);
    }
  }
}
