import {
  DevelopmentBattleSession,
  type DevelopmentBattleView,
  FantasiaRuntimeSession,
  runtimeStatus,
} from "@fantasia/runtime";
import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { createBrowserInputBinding } from "./foundation-browser.js";
import "./styles.css";

function App() {
  const battle = useMemo(() => new DevelopmentBattleSession(), []);
  const [view, setView] = useState<DevelopmentBattleView>(() => battle.view());
  const [message, setMessage] = useState("The fastest unit is active. Move or use its Main Act.");

  useEffect(() => {
    const session = new FantasiaRuntimeSession({
      fixedStep: {
        stepMs: 50,
        maxFrameDeltaMs: 250,
        maxStepsPerFrame: 5,
      },
      random: { kind: "seed", seed: 0 },
      bindings: [{ action: "shell.confirm", binding: { kind: "key", code: "Enter" } }],
      contexts: [
        {
          id: "shell",
          priority: 0,
          actions: [{ action: "shell.confirm" }],
        },
      ],
      activeContexts: ["shell"],
    });
    const input = createBrowserInputBinding(session);
    input.attach();

    return () => input.detach();
  }, []);

  const actorById = new Map(view.actors.map((actor) => [actor.id, actor]));
  const columns = view.bounds.maxX - view.bounds.minX + 1;
  const attackTarget = view.actors.find((actor) => actor.side !== view.selectedActorSide);
  const selectedIsActive = view.selectedActorId === view.activeActorId;

  function selectActor(id: string) {
    const next = battle.selectActor(id);
    if (next === undefined) return;
    setView(next);
    const actor = next.actors.find((candidate) => candidate.id === id);
    setMessage(
      actor?.active
        ? `${actor.name} is active. Movement and Main Act commands are available.`
        : `${actor?.name ?? "Unit"} selected for inspection. Only ${next.activeActorName} can act.`,
    );
  }

  function previewCell(x: number, y: number, reachable: boolean) {
    if (!reachable) {
      setView(battle.view());
      return;
    }
    setView(battle.view({ x, y }));
  }

  function clearPreview() {
    setView(battle.view());
  }

  function activateCell(cell: DevelopmentBattleView["cells"][number]) {
    if (cell.occupantActorId !== undefined) {
      selectActor(cell.occupantActorId);
      return;
    }
    if (!cell.reachable) {
      setMessage(
        selectedIsActive
          ? "That destination is outside the active unit's remaining movement."
          : `Only ${view.activeActorName} can move during this turn.`,
      );
      return;
    }

    const result = battle.moveSelected({ x: cell.x, y: cell.y });
    if (result.kind === "moved") {
      setView(result.view);
      setMessage(
        `${result.view.selectedActorName} moved to ${cell.x}, ${cell.y}. ${result.view.movementRemaining} movement remains.`,
      );
      return;
    }
    setMessage(
      result.reason === "not-active-actor"
        ? `Only ${view.activeActorName} can move during this turn.`
        : "Movement was rejected by the authoritative battlefield rules.",
    );
  }

  function attack() {
    if (attackTarget === undefined) return;
    const result = battle.attackSelected(attackTarget.id);
    if (result.kind === "resolved") {
      setView(result.view);
      setMessage(
        `${result.attackerName} hit ${result.defenderName} for ${result.damage} damage${result.critical ? " (critical)" : ""}.`,
      );
      return;
    }
    if (result.kind === "missed") {
      setView(result.view);
      setMessage(`${result.attackerName} missed ${result.defenderName}.`);
      return;
    }

    const reasons: Record<typeof result.reason, string> = {
      "unknown-actor": "The combat target no longer exists.",
      "not-active-actor": `Only ${view.activeActorName} can use actions during this turn.`,
      "main-act-spent": "The active unit has already spent its Main Act.",
      "same-side-target": "The graybox basic attack cannot target an ally.",
      "out-of-range": `${attackTarget.name} is outside the graybox basic attack range.`,
      "out-of-elevation-reach": `${attackTarget.name} is outside the attack's elevation reach.`,
      "invalid-attack": "The authoritative combat resolver rejected the attack.",
    };
    setMessage(reasons[result.reason]);
  }

  return (
    <main class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Drakeshard Studios / Development Build</p>
          <h1>Fantasia</h1>
        </div>
        <div class="runtime-chip" title={runtimeStatus()}>
          <span class="runtime-dot" aria-hidden="true" />
          Runtime online
        </div>
      </header>

      <section class="mission-strip" aria-label="Development mission">
        <div>
          <p class="section-kicker">Playtest Scenario</p>
          <h2>{view.title}</h2>
          <p>{view.subtitle}</p>
        </div>
        <div class="mission-meta">
          <span>Turn: {view.activeActorName}</span>
          <span>Move {view.movementRemaining}</span>
          <span>Main Act {view.mainActAvailable ? "ready" : "spent"}</span>
        </div>
      </section>

      <section class="battle-layout">
        <aside class="unit-rail" aria-label="Available units">
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
                <span class="unit-move">{actor.active ? "ACTIVE" : `MOV ${actor.moveBudget}`}</span>
              </button>
            ))}
          </div>
        </aside>

        <section class="battlefield-panel" aria-label="Tactical battlefield">
          <div class="battlefield-toolbar">
            <div>
              <p class="section-kicker">Battlefield</p>
              <strong>GAME-I05 combat playground</strong>
            </div>
            <div class="legend">
              <span>
                <i class="legend-dot reachable" /> Reachable
              </span>
              <span>
                <i class="legend-dot elevated" /> Elevated
              </span>
              <span>
                <i class="legend-dot blocked" /> Blocked
              </span>
            </div>
          </div>

          <div class="battlefield-wrap">
            <div
              class="battlefield-grid"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(54px, 1fr))` }}
            >
              {view.cells.map((cell) => {
                const actor = cell.occupantActorId
                  ? actorById.get(cell.occupantActorId)
                  : undefined;
                const classes = [
                  "battle-cell",
                  cell.blocked ? "is-blocked" : "",
                  cell.elevation > 0 ? `elevation-${Math.min(cell.elevation, 2)}` : "",
                  cell.reachable && actor === undefined ? "is-reachable" : "",
                  cell.path ? "is-path" : "",
                  actor !== undefined ? "has-actor" : "",
                  actor?.selected ? "has-selected-actor" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <button
                    type="button"
                    class={classes}
                    data-testid={`cell-${cell.x}-${cell.y}`}
                    onMouseEnter={() => previewCell(cell.x, cell.y, cell.reachable)}
                    onFocus={() => previewCell(cell.x, cell.y, cell.reachable)}
                    onBlur={clearPreview}
                    onClick={() => activateCell(cell)}
                    disabled={cell.blocked}
                    aria-label={`Tile ${cell.x}, ${cell.y}${actor ? `, ${actor.name}` : ""}${cell.elevation > 0 ? `, elevation ${cell.elevation}` : ""}`}
                  >
                    <span class="tile-coord">
                      {cell.x},{cell.y}
                    </span>
                    {cell.elevation > 0 && <span class="elevation-badge">▲{cell.elevation}</span>}
                    {cell.reachableCost !== undefined && actor === undefined && (
                      <span class="move-cost">{cell.reachableCost}</span>
                    )}
                    {actor !== undefined && (
                      <span class={`battle-token${actor.selected ? " is-selected" : ""}`}>
                        {actor.shortLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside class="detail-panel" aria-label="Selected unit details">
          <p class="section-kicker">Selected Unit</p>
          <div class="selected-unit-heading">
            <span class="selected-unit-avatar">
              {view.actors.find((actor) => actor.selected)?.shortLabel ?? "--"}
            </span>
            <div>
              <h3>{view.selectedActorName}</h3>
              <p>
                {view.selectedActorRole} · {view.selectedActorSide}{" "}
                {selectedIsActive ? "· Active" : ""}
              </p>
            </div>
          </div>

          <dl class="stat-grid" aria-label="Selected unit RPG stats">
            <div>
              <dt>HP</dt>
              <dd>
                {view.selectedHpCurrent}/{view.selectedHpCapacity}
              </dd>
            </div>
            <div>
              <dt>Movement</dt>
              <dd>{selectedIsActive ? view.movementRemaining : view.selectedMoveBudget}</dd>
            </div>
            <div>
              <dt>Physical Power</dt>
              <dd>{view.selectedAttributes.physicalPower}</dd>
            </div>
            <div>
              <dt>Magical Power</dt>
              <dd>{view.selectedAttributes.magicalPower}</dd>
            </div>
            <div>
              <dt>Defense</dt>
              <dd>{view.selectedAttributes.defense}</dd>
            </div>
            <div>
              <dt>Resistance</dt>
              <dd>{view.selectedAttributes.resistance}</dd>
            </div>
            <div>
              <dt>Speed</dt>
              <dd>{view.selectedAttributes.speed}</dd>
            </div>
            <div>
              <dt>Stability</dt>
              <dd>{view.selectedAttributes.stability}</dd>
            </div>
            <div>
              <dt>Main Act</dt>
              <dd>{selectedIsActive ? (view.mainActAvailable ? "Ready" : "Spent") : "—"}</dd>
            </div>
            <div>
              <dt>Path cost</dt>
              <dd>{view.pathCost ?? "—"}</dd>
            </div>
          </dl>

          <div class="command-box">
            <p class="section-kicker">Command</p>
            <strong>Move / Basic Attack</strong>
            <button
              type="button"
              class="command-action"
              onClick={attack}
              disabled={!selectedIsActive || !view.mainActAvailable || attackTarget === undefined}
            >
              Attack {attackTarget?.name ?? "—"}
            </button>
            <p>{message}</p>
          </div>

          <div class="dev-note">
            <strong>Development combat policy</strong>
            <p>
              Matchup, targeting, turn, and HP transitions are authoritative. Final
              Defense/Resistance mitigation math remains deliberately graybox and replaceable until
              the combat formula is approved.
            </p>
          </div>
        </aside>
      </section>

      <footer class="statusbar">
        <span>{runtimeStatus()}</span>
        <span>GAME-I05 · deterministic combat + turn foundation</span>
      </footer>
    </main>
  );
}

const root = document.getElementById("app");
if (!root) {
  throw new Error("Fantasia root element was not found.");
}

render(<App />, root);
