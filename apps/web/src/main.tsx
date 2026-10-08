import {
  DevelopmentBattleSession,
  FantasiaRuntimeSession,
  runtimeStatus,
  type DevelopmentBattleView,
} from "@fantasia/runtime";
import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { createBrowserInputBinding } from "./foundation-browser.js";
import "./styles.css";

function App() {
  const battle = useMemo(() => new DevelopmentBattleSession(), []);
  const [view, setView] = useState<DevelopmentBattleView>(() => battle.view());
  const [message, setMessage] = useState("Select a unit, then choose a highlighted destination.");

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

  function selectActor(id: string) {
    const next = battle.selectActor(id);
    if (next === undefined) return;
    setView(next);
    const actor = next.actors.find((candidate) => candidate.id === id);
    setMessage(`${actor?.name ?? "Unit"} selected. Movement range refreshed.`);
  }

  function previewCell(x: number, y: number, reachable: boolean) {
    if (!reachable) return;
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
      setMessage("That destination is outside the selected unit's current movement range.");
      return;
    }

    const result = battle.moveSelected({ x: cell.x, y: cell.y });
    if (result.kind === "moved") {
      setView(result.view);
      setMessage(`${result.view.selectedActorName} moved to ${cell.x}, ${cell.y}.`);
      return;
    }
    setMessage("Movement was rejected by the authoritative battlefield rules.");
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
          <span>Four-direction grid</span>
          <span>Movement only</span>
          <span>Renderer neutral</span>
        </div>
      </section>

      <section class="battle-layout">
        <aside class="unit-rail" aria-label="Available units">
          <p class="section-kicker">Squad</p>
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
                  <small>{actor.role}</small>
                </span>
                <span class="unit-move">MOV {actor.moveBudget}</span>
              </button>
            ))}
          </div>
        </aside>

        <section class="battlefield-panel" aria-label="Tactical battlefield">
          <div class="battlefield-toolbar">
            <div>
              <p class="section-kicker">Battlefield</p>
              <strong>GAME-I03 movement playground</strong>
            </div>
            <div class="legend" aria-label="Battlefield legend">
              <span><i class="legend-dot reachable" /> Reachable</span>
              <span><i class="legend-dot elevated" /> Elevated</span>
              <span><i class="legend-dot blocked" /> Blocked</span>
            </div>
          </div>

          <div class="battlefield-wrap">
            <div
              class="battlefield-grid"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(54px, 1fr))` }}
              onMouseLeave={clearPreview}
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
                    <span class="tile-coord">{cell.x},{cell.y}</span>
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
              <p>{view.selectedActorRole}</p>
            </div>
          </div>

          <dl class="stat-grid">
            <div>
              <dt>Movement</dt>
              <dd>{view.selectedMoveBudget}</dd>
            </div>
            <div>
              <dt>Path cost</dt>
              <dd>{view.pathCost ?? "—"}</dd>
            </div>
            <div>
              <dt>Adjacency</dt>
              <dd>4-way</dd>
            </div>
            <div>
              <dt>Mode</dt>
              <dd>Move</dd>
            </div>
          </dl>

          <div class="command-box">
            <p class="section-kicker">Command</p>
            <strong>Move</strong>
            <p>{message}</p>
          </div>

          <div class="dev-note">
            <strong>Development UI</strong>
            <p>
              Presentation mirrors authoritative state. Combat, turns, final art, and production
              renderer selection remain intentionally outside this slice.
            </p>
          </div>
        </aside>
      </section>

      <footer class="statusbar">
        <span>{runtimeStatus()}</span>
        <span>GAME-UI01 · HTML/CSS + Preact presentation</span>
      </footer>
    </main>
  );
}

const root = document.getElementById("app");
if (!root) {
  throw new Error("Fantasia root element was not found.");
}

render(<App />, root);
