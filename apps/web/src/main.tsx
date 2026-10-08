import {
  ProductionBattleSession,
  type ProductionBattleView,
  runtimeStatus,
} from "@fantasia/runtime";
import { render } from "preact";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ProductionBattleRenderer } from "./battle-renderer.js";
import "./styles.css";
import "./production.css";

function commandMessage(result: ReturnType<ProductionBattleSession["moveSelected"]>): string {
  if (result.kind === "rejected") return `Command rejected: ${result.reason}.`;
  if (result.event?.kind === "actor-moved") {
    return `Moved to ${result.event.goal.x}, ${result.event.goal.y}. ${result.event.movementRemaining} movement remains.`;
  }
  if (result.event?.kind === "direct-attack-resolved") {
    return `Attack dealt ${result.event.appliedDamage} damage${result.event.critical ? " (critical)" : ""}.`;
  }
  if (result.event?.kind === "direct-attack-missed") return "The attack missed.";
  if (result.event?.kind === "turn-ended") {
    return `Turn ended. Round ${result.event.round}; next actor is active.`;
  }
  if (result.event?.kind === "encounter-ended") return `Encounter ended: ${result.event.outcome}.`;
  return "Authoritative command applied.";
}

function App() {
  const battle = useMemo(() => new ProductionBattleSession(), []);
  const [view, setView] = useState<ProductionBattleView>(() => battle.view());
  const [message, setMessage] = useState("Select a unit or battlefield cell. The active unit may act.");
  const rendererHost = useRef<HTMLDivElement>(null);
  const renderer = useRef<ProductionBattleRenderer>();

  useEffect(() => {
    const host = rendererHost.current;
    if (!host) return;

    const instance = new ProductionBattleRenderer(host, {
      onCellActivate: (cell) => {
        if (cell.occupantActorId !== undefined) {
          const selected = battle.selectActor(cell.occupantActorId);
          if (selected) {
            setView(selected);
            setMessage(`${selected.selectedActorName} selected for inspection.`);
          }
          return;
        }

        const current = battle.view();
        if (!cell.reachable || current.selectedActorId !== current.activeActorId) {
          setView(current);
          setMessage(`Only ${current.activeActorName} can move to a reachable cell this turn.`);
          return;
        }
        const result = battle.moveSelected({ x: cell.x, y: cell.y });
        setView(result.view);
        setMessage(commandMessage(result));
      },
      onCellPreview: (cell) => {
        setView(cell?.reachable ? battle.view({ x: cell.x, y: cell.y }) : battle.view());
      },
    });
    renderer.current = instance;
    void instance.init().then(() => instance.update(battle.view()));

    return () => {
      renderer.current = undefined;
      instance.destroy();
    };
  }, [battle]);

  useEffect(() => {
    renderer.current?.update(view);
  }, [view]);

  const selectedActor = view.actors.find((actor) => actor.id === view.selectedActorId);
  const attackTarget = view.actors.find(
    (actor) => actor.side !== view.selectedActorSide && !actor.defeated,
  );
  const selectedIsActive = view.selectedActorId === view.activeActorId;
  const encounterEnded = view.outcome !== "ongoing";

  function selectActor(id: string) {
    const next = battle.selectActor(id);
    if (!next) return;
    setView(next);
    setMessage(
      next.selectedActorId === next.activeActorId
        ? `${next.selectedActorName} is active and can receive commands.`
        : `${next.selectedActorName} selected for inspection. ${next.activeActorName} owns the turn.`,
    );
  }

  function attack() {
    if (!attackTarget) return;
    const result = battle.attackSelected(attackTarget.id);
    setView(result.view);
    setMessage(commandMessage(result));
  }

  function endTurn() {
    const result = battle.endTurn();
    setView(result.view);
    setMessage(commandMessage(result));
  }

  return (
    <main class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Drakeshard Studios / Production Renderer Slice</p>
          <h1>Fantasia</h1>
        </div>
        <div class="runtime-chip" title={runtimeStatus()}>
          <span class="runtime-dot" aria-hidden="true" />
          Pixi / WebGL · Runtime tick {view.runtimeTick}
        </div>
      </header>

      <section class="mission-strip" aria-label="Production renderer scenario">
        <div>
          <p class="section-kicker">GAME-I08 Vertical Slice</p>
          <h2>{view.title}</h2>
          <p>{view.subtitle}</p>
        </div>
        <div class="mission-meta">
          <span>Round {view.round}</span>
          <span>Turn: {view.activeActorName}</span>
          <span>Move {view.movementRemaining}</span>
          <span>Main Act {view.mainActAvailable ? "ready" : "spent"}</span>
          <span>Outcome {view.outcome}</span>
        </div>
      </section>

      <section class="battle-layout production-layout">
        <aside class="unit-rail" aria-label="Combatants">
          <p class="section-kicker">Combatants</p>
          <div class="unit-list">
            {view.actors.map((actor) => (
              <button
                type="button"
                class={`unit-card${actor.selected ? " is-selected" : ""}`}
                onClick={() => selectActor(actor.id)}
                aria-pressed={actor.selected}
              >
                <span class="unit-avatar">{actor.shortLabel}</span>
                <span class="unit-copy">
                  <strong>{actor.name}</strong>
                  <small>
                    {actor.role} · HP {actor.hpCurrent}/{actor.hpCapacity}
                  </small>
                </span>
                <span class="unit-move">{actor.active ? "ACTIVE" : actor.defeated ? "DOWN" : actor.side}</span>
              </button>
            ))}
          </div>
        </aside>

        <section class="battlefield-panel production-battlefield-panel" aria-label="Production tactical battlefield">
          <div class="battlefield-toolbar">
            <div>
              <p class="section-kicker">Production Battlefield</p>
              <strong>Fixed oblique 2.5D projection · authoritative square geometry</strong>
            </div>
            <div class="legend">
              <span><i class="legend-dot reachable" /> Reachable</span>
              <span><i class="legend-dot elevated" /> Elevation</span>
              <span><i class="legend-dot blocked" /> Blocked</span>
            </div>
          </div>
          <div
            ref={rendererHost}
            class="pixi-battlefield"
            data-testid="production-battlefield"
            aria-label="Interactive Pixi battlefield canvas"
          />
          <p class="renderer-note">
            Placeholder unit markers are renderer-engineering visuals only. Final pixel sprites remain a separate art-production approval.
          </p>
        </section>

        <aside class="detail-panel" aria-label="Selected unit details">
          <p class="section-kicker">Selected Unit</p>
          <div class="selected-unit-heading">
            <span class="selected-unit-avatar">{selectedActor?.shortLabel ?? "--"}</span>
            <div>
              <h3>{view.selectedActorName}</h3>
              <p>
                {view.selectedActorRole} · {view.selectedActorSide}
                {selectedIsActive ? " · Active" : ""}
              </p>
            </div>
          </div>

          <dl class="stat-grid" aria-label="Selected unit RPG stats">
            <div><dt>HP</dt><dd>{view.selectedHpCurrent}/{view.selectedHpCapacity}</dd></div>
            <div><dt>Movement</dt><dd>{selectedIsActive ? view.movementRemaining : "—"}</dd></div>
            <div><dt>Physical Power</dt><dd>{view.selectedAttributes.physicalPower}</dd></div>
            <div><dt>Magical Power</dt><dd>{view.selectedAttributes.magicalPower}</dd></div>
            <div><dt>Defense</dt><dd>{view.selectedAttributes.defense}</dd></div>
            <div><dt>Resistance</dt><dd>{view.selectedAttributes.resistance}</dd></div>
            <div><dt>Speed</dt><dd>{view.selectedAttributes.speed}</dd></div>
            <div><dt>Stability</dt><dd>{view.selectedAttributes.stability}</dd></div>
            <div><dt>Main Act</dt><dd>{selectedIsActive ? (view.mainActAvailable ? "Ready" : "Spent") : "—"}</dd></div>
            <div><dt>Path cost</dt><dd>{view.pathCost ?? "—"}</dd></div>
          </dl>

          <div class="command-box">
            <p class="section-kicker">Commands</p>
            <div class="command-actions">
              <button
                type="button"
                class="command-action"
                onClick={attack}
                disabled={encounterEnded || !selectedIsActive || !view.mainActAvailable || !attackTarget}
              >
                Attack {attackTarget?.name ?? "—"}
              </button>
              <button
                type="button"
                class="command-action secondary"
                onClick={endTurn}
                disabled={encounterEnded}
              >
                End turn
              </button>
            </div>
            <p aria-live="polite">{message}</p>
          </div>

          <div class="dev-note production-note">
            <strong>Authority boundary</strong>
            <p>
              Pixi projects square coordinates and logical elevation into screen space. Movement legality, occupancy, attacks, HP, turns, outcome, and RNG remain authoritative in the encounter/runtime layers.
            </p>
          </div>
        </aside>
      </section>

      <footer class="statusbar">
        <span>{runtimeStatus()}</span>
        <span>GAME-I08 · PixiJS renderer + Preact HUD · fixed camera</span>
      </footer>
    </main>
  );
}

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia root element was not found.");
render(<App />, root);
