import {
  createPlaytestBattlefield,
  FantasiaRuntimeSession,
  runtimeStatus,
  type PlaytestCoord,
} from "@fantasia/runtime";
import { render } from "preact";
import { useEffect, useMemo, useState } from "preact/hooks";
import { createBrowserInputBinding } from "./foundation-browser.js";
import "./styles.css";

const playtest = createPlaytestBattlefield();

function keyFor(coord: PlaytestCoord): string {
  return `${coord.x},${coord.y}`;
}

function App() {
  const [selectedActorId, setSelectedActorId] = useState("actor:mc");
  const [hovered, setHovered] = useState<PlaytestCoord | undefined>();
  const [revision, setRevision] = useState(0);

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

  const snapshot = useMemo(() => playtest.snapshot(selectedActorId), [selectedActorId, revision]);
  const selectedActor = snapshot.actors.find((actor) => actor.id === selectedActorId) ?? snapshot.actors[0];
  const path = hovered === undefined ? undefined : playtest.previewPath(selectedActorId, hovered);
  const pathKeys = new Set(path?.coords.map(keyFor) ?? []);

  const moveOrSelect = (tile: (typeof snapshot.tiles)[number]) => {
    if (tile.occupantActorId !== undefined) {
      setSelectedActorId(tile.occupantActorId);
      return;
    }
    if (!tile.reachable) return;
    const result = playtest.moveActor(selectedActorId, { x: tile.x, y: tile.y });
    if (result.kind === "moved") {
      setRevision((value) => value + 1);
      setHovered(undefined);
    }
  };

  return (
    <main class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Drakeshard Studios · Development Build</p>
          <h1>Fantasia</h1>
        </div>
        <div class="runtime-pill">{runtimeStatus()}</div>
      </header>

      <section class="playtest-layout" aria-label="Fantasia tactical playtest">
        <aside class="panel unit-panel">
          <p class="section-kicker">Selected unit</p>
          <div class="selected-unit-mark">{selectedActor?.glyph ?? "?"}</div>
          <h2>{selectedActor?.name ?? "Unknown"}</h2>
          <p>{selectedActor?.subtitle ?? ""}</p>
          <div class="stat-grid">
            <span><b>Move</b> 4</span>
            <span><b>Climb</b> 1</span>
            <span><b>Drop</b> 1</span>
            <span><b>Grid</b> 4-dir</span>
          </div>
          <p class="hint">Click a unit to select it. Hover a reachable square to preview the deterministic path, then click to move.</p>
        </aside>

        <section class="battlefield-card">
          <div class="battlefield-heading">
            <div>
              <p class="section-kicker">GAME-I03 visual pressure test</p>
              <h2>Tactical Playtest</h2>
            </div>
            <div class="legend" aria-label="Battlefield legend">
              <span><i class="legend-swatch reachable" /> Reachable</span>
              <span><i class="legend-swatch elevated" /> Elevation</span>
              <span><i class="legend-swatch blocked" /> Blocked</span>
            </div>
          </div>

          <div
            class="battlefield-grid"
            style={{ gridTemplateColumns: `repeat(${snapshot.width}, minmax(0, 1fr))` }}
            data-testid="battlefield"
          >
            {snapshot.tiles.map((tile) => {
              const occupant = snapshot.actors.find((actor) => actor.id === tile.occupantActorId);
              const inPath = pathKeys.has(tile.key);
              const classes = [
                "tile",
                tile.blocked ? "is-blocked" : "",
                tile.reachable ? "is-reachable" : "",
                inPath ? "is-path" : "",
                tile.elevation > 0 ? `elevation-${Math.min(tile.elevation, 2)}` : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  type="button"
                  class={classes}
                  aria-label={`Tile ${tile.x},${tile.y}`}
                  data-reachable={tile.reachable ? "true" : "false"}
                  onMouseEnter={() => setHovered({ x: tile.x, y: tile.y })}
                  onMouseLeave={() => setHovered(undefined)}
                  onFocus={() => setHovered({ x: tile.x, y: tile.y })}
                  onClick={() => moveOrSelect(tile)}
                >
                  <span class="coord">{tile.x},{tile.y}</span>
                  {tile.elevation > 0 && <span class="elevation-badge">▲{tile.elevation}</span>}
                  {tile.blocked && <span class="blocked-mark" aria-hidden="true">◆</span>}
                  {occupant && (
                    <span class={`unit-token ${occupant.team}`} title={occupant.name}>
                      {occupant.glyph}
                    </span>
                  )}
                  {tile.reachable && tile.movementCost !== undefined && tile.movementCost > 0 && (
                    <span class="move-cost">{tile.movementCost}</span>
                  )}
                </button>
              );
            })}
          </div>

          <footer class="battlefield-footer">
            <span>Authoritative movement: GAME-I03</span>
            <span>{path ? `Preview path cost: ${path.cost}` : "Hover reachable terrain to preview a path"}</span>
          </footer>
        </section>
      </section>
    </main>
  );
}

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia root element was not found.");
render(<App />, root);
