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
  return "Command applied.";
}

function outcomeLabel(outcome: ProductionBattleView["outcome"]): string {
  switch (outcome) {
    case "player-victory":
      return "Victory";
    case "enemy-victory":
      return "Defeat";
    case "draw":
      return "Draw";
    default:
      return "Battle in progress";
  }
}

function hpPercent(current: number, capacity: number): number {
  return capacity <= 0 ? 0 : Math.max(0, Math.min(100, (current / capacity) * 100));
}

function App() {
  const battle = useMemo(() => new ProductionBattleSession(), []);
  const [view, setView] = useState<ProductionBattleView>(() => battle.view());
  const [message, setMessage] = useState("Choose a unit or a reachable tile.");
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
            setMessage(`${selected.selectedActorName} selected.`);
          }
          return;
        }

        const current = battle.view();
        if (!cell.reachable || current.selectedActorId !== current.activeActorId) {
          setView(current);
          setMessage(`Only ${current.activeActorName} can move to a reachable tile this turn.`);
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
        ? `${next.selectedActorName} is ready for orders.`
        : `${next.selectedActorName} selected. ${next.activeActorName} has the turn.`,
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
    <main class="fantasia-shell">
      <header class="game-masthead">
        <div class="wordmark-wrap">
          <span class="wordmark-mark" aria-hidden="true">F</span>
          <div>
            <p class="masthead-kicker">Drakeshard Studios</p>
            <h1>Fantasia</h1>
          </div>
        </div>
        <div class="turn-banner" aria-label={`Round ${view.round}, ${view.activeActorName}'s turn`}>
          <span class="turn-banner-label">Round {view.round}</span>
          <strong>{view.activeActorName}&apos;s Turn</strong>
        </div>
      </header>

      <section class="battle-brief" aria-label="Skirmish objective">
        <div class="battle-brief-title">
          <span class="battle-crest" aria-hidden="true">⚔</span>
          <div>
            <p class="ui-kicker">Skirmish</p>
            <h2>Hold the field</h2>
            <p class="objective-copy">Objective · Defeat all enemies</p>
          </div>
        </div>
        <div class="turn-resources" aria-label="Current turn resources">
          <span><small>Move</small><strong>{view.movementRemaining}</strong></span>
          <span><small>Main Act</small><strong>{view.mainActAvailable ? "Ready" : "Spent"}</strong></span>
          <span><small>Status</small><strong>{outcomeLabel(view.outcome)}</strong></span>
        </div>
      </section>

      <section class="battle-layout fantasy-layout">
        <aside class="party-panel" aria-label="Combatants">
          <div class="panel-heading">
            <p class="ui-kicker">Battle Order</p>
            <span>{view.actors.filter((actor) => !actor.defeated).length} standing</span>
          </div>
          <div class="unit-list">
            {view.actors.map((actor) => (
              <button
                type="button"
                class={`roster-entry ${actor.side}${actor.selected ? " is-selected" : ""}${actor.active ? " is-active" : ""}`}
                onClick={() => selectActor(actor.id)}
                aria-pressed={actor.selected}
              >
                <span class="unit-sigil" aria-hidden="true">{actor.shortLabel}</span>
                <span class="unit-copy">
                  <strong>{actor.name}</strong>
                  <small>{actor.role}</small>
                  <span class="mini-hp" aria-hidden="true">
                    <i style={{ width: `${hpPercent(actor.hpCurrent, actor.hpCapacity)}%` }} />
                  </span>
                  <small>HP {actor.hpCurrent}/{actor.hpCapacity}</small>
                </span>
                <span class="unit-state">
                  {actor.active ? "TURN" : actor.defeated ? "DOWN" : actor.side === "player" ? "ALLY" : "FOE"}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section class="battlefield-frame" aria-label="Tactical battlefield">
          <div class="battlefield-ribbon">
            <div>
              <p class="ui-kicker">Tactical Field</p>
              <strong>{selectedIsActive ? "Choose your ground" : `Watching ${view.selectedActorName}`}</strong>
            </div>
            <div class="field-legend" aria-label="Battlefield legend">
              <span><i class="legend-mark reachable" /> Reachable</span>
              <span><i class="legend-mark path" /> Route</span>
              <span><i class="legend-mark blocked" /> Obstacle</span>
            </div>
          </div>
          <div ref={rendererHost} class="pixi-battlefield" data-testid="production-battlefield" />
          <div class="battle-log" aria-live="polite">
            <span class="battle-log-mark" aria-hidden="true">◆</span>
            <p>{message}</p>
          </div>
        </section>

        <aside class="character-panel" aria-label="Selected unit details">
          <div class={`character-portrait-placeholder ${view.selectedActorSide}`} aria-hidden="true">
            <span>{selectedActor?.shortLabel ?? "--"}</span>
          </div>
          <div class="character-heading">
            <p class="ui-kicker">Selected Unit</p>
            <h3>{view.selectedActorName}</h3>
            <p>{view.selectedActorRole} · {view.selectedActorSide === "player" ? "Ally" : "Enemy"}</p>
          </div>

          <section class="hp-block" aria-label="Selected unit health">
            <div class="hp-line">
              <span>HP</span>
              <strong>{view.selectedHpCurrent} / {view.selectedHpCapacity}</strong>
            </div>
            <div class="hp-track"><i style={{ width: `${hpPercent(view.selectedHpCurrent, view.selectedHpCapacity)}%` }} /></div>
          </section>

          <div class="combat-summary">
            <div><small>Physical</small><strong>{view.selectedAttributes.physicalPower}</strong></div>
            <div><small>Defense</small><strong>{view.selectedAttributes.defense}</strong></div>
            <div><small>Speed</small><strong>{view.selectedAttributes.speed}</strong></div>
            <div><small>Stability</small><strong>{view.selectedAttributes.stability}</strong></div>
          </div>

          <details class="secondary-stats">
            <summary>More stats</summary>
            <dl>
              <div><dt>Magical Power</dt><dd>{view.selectedAttributes.magicalPower}</dd></div>
              <div><dt>Resistance</dt><dd>{view.selectedAttributes.resistance}</dd></div>
              <div><dt>Movement</dt><dd>{selectedIsActive ? view.movementRemaining : "—"}</dd></div>
              <div><dt>Path cost</dt><dd>{view.pathCost ?? "—"}</dd></div>
            </dl>
          </details>

          <section class="command-panel" aria-label="Battle commands">
            <p class="ui-kicker">Commands</p>
            <button
              type="button"
              class="battle-command primary"
              onClick={attack}
              disabled={encounterEnded || !selectedIsActive || !view.mainActAvailable || !attackTarget}
            >
              <span class="command-icon" aria-hidden="true">⚔</span>
              <span><strong>Attack {attackTarget?.name ?? "—"}</strong><small>Basic attack</small></span>
            </button>
            <button
              type="button"
              class="battle-command secondary"
              onClick={endTurn}
              disabled={encounterEnded}
            >
              <span class="command-icon" aria-hidden="true">◇</span>
              <span><strong>End Turn</strong><small>Pass initiative</small></span>
            </button>
          </section>

          <details class="debug-details">
            <summary>Developer diagnostics</summary>
            <div class="debug-copy">
              <p>{runtimeStatus()}</p>
              <p>Pixi / WebGL · Runtime tick {view.runtimeTick}</p>
              <p>Fixed oblique projection · square geometry · fixed camera</p>
            </div>
          </details>
        </aside>
      </section>
    </main>
  );
}

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia root element was not found.");
render(<App />, root);
