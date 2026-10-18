import type { ProductionBattleCellView, ProductionBattleView } from "@fantasia/runtime";
import {
  type BattlefieldRenderFrame,
  type BattlefieldRenderUnit,
  battlefieldCellKey,
} from "./battlefield-engine.js";
import { BattlefieldRenderer } from "./battlefield-renderer.js";
import type { BattlefieldTerrainVisualId, BattlefieldUnitVisualId } from "./battlefield-presentation.js";

export interface BattleRendererCallbacks {
  readonly onCellActivate: (cell: ProductionBattleCellView) => void;
  readonly onCellPreview: (cell: ProductionBattleCellView | undefined) => void;
}

function terrainVisualId(cell: ProductionBattleCellView): BattlefieldTerrainVisualId {
  if (cell.blocked) return "terrain.blocked";
  if (cell.elevation >= 2) return "terrain.plateau";
  if (cell.elevation === 1) return "terrain.ridge";
  return "terrain.grass";
}

function unitVisualId(side: "player" | "enemy"): BattlefieldUnitVisualId {
  return side === "player" ? "unit.allied" : "unit.enemy";
}

function productionBattleFrame(view: ProductionBattleView): {
  readonly frame: BattlefieldRenderFrame;
  readonly sourceCells: ReadonlyMap<string, ProductionBattleCellView>;
} {
  const sourceCells = new Map<string, ProductionBattleCellView>();
  const actorCellById = new Map<string, ProductionBattleCellView>();

  const cells = view.cells.map((cell) => {
    const key = battlefieldCellKey(cell);
    sourceCells.set(key, cell);
    if (cell.occupantActorId) actorCellById.set(cell.occupantActorId, cell);
    return {
      x: cell.x,
      y: cell.y,
      elevation: cell.elevation,
      terrainVisualId: terrainVisualId(cell),
      ...(cell.blocked ? { blocked: true, propVisualId: "prop.rubble" as const } : {}),
      ...(cell.reachable ? { reachable: true } : {}),
      ...(cell.path ? { path: true } : {}),
      ...(cell.reachableCost !== undefined ? { reachableCost: cell.reachableCost } : {}),
    };
  });

  const units: BattlefieldRenderUnit[] = [];
  for (const actor of view.actors) {
    const cell = actorCellById.get(actor.id);
    if (!cell) continue;
    units.push({
      id: actor.id,
      cell: { x: cell.x, y: cell.y },
      visualId: unitVisualId(actor.side),
      label: actor.shortLabel,
      selected: actor.selected,
      active: actor.active,
      defeated: actor.defeated,
    });
  }

  return {
    frame: {
      id: `production:${view.title}`,
      bounds: view.bounds,
      cells,
      units,
    },
    sourceCells,
  };
}

/** Thin production adapter over the standardized title-local battlefield renderer. */
export class ProductionBattleRenderer {
  readonly #callbacks: BattleRendererCallbacks;
  readonly #renderer: BattlefieldRenderer;
  #sourceCells: ReadonlyMap<string, ProductionBattleCellView> = new Map();

  constructor(host: HTMLElement, callbacks: BattleRendererCallbacks) {
    this.#callbacks = callbacks;
    this.#renderer = new BattlefieldRenderer(
      host,
      {
        testId: "production-battlefield-canvas",
        ariaLabel: "Fantasia tactical battlefield",
        antialias: false,
      },
      {
        onCellActivate: (cell) => {
          const source = this.#sourceCells.get(battlefieldCellKey(cell));
          if (source) this.#callbacks.onCellActivate(source);
        },
        onCellPreview: (cell) => {
          this.#callbacks.onCellPreview(
            cell ? this.#sourceCells.get(battlefieldCellKey(cell)) : undefined,
          );
        },
      },
    );
  }

  init(): Promise<void> {
    return this.#renderer.init();
  }

  update(view: ProductionBattleView): void {
    const adapted = productionBattleFrame(view);
    this.#sourceCells = adapted.sourceCells;
    this.#renderer.update(adapted.frame, { showUnits: true });
  }

  destroy(): void {
    this.#renderer.destroy();
  }
}
