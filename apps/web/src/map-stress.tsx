import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  STRESS_MAP_BY_KEY,
  STRESS_MAP_CELLS,
  STRESS_MAP_HEIGHT,
  STRESS_MAP_MAX_ELEVATION,
  STRESS_MAP_MAX_SENTINEL,
  STRESS_MAP_MIN_ELEVATION,
  STRESS_MAP_MIN_SENTINEL,
  STRESS_MAP_WIDTH,
  type StressMapCell,
} from "./map-stress-data.js";
import {
  StressMapRenderer,
  type StressMapRendererOptions,
} from "./map-stress-renderer.js";

type ReviewMode = "battlefield" | "blueprint";

interface RendererRef {
  current: StressMapRenderer | undefined;
}

function key(cell: StressMapCell): string {
  return `${cell.x},${cell.y}`;
}

function BattlefieldStressReview({
  selected,
  showGrid,
  showCoordinates,
  onSelect,
  controllerRef,
}: {
  readonly selected: StressMapCell;
  readonly showGrid: boolean;
  readonly showCoordinates: boolean;
  readonly onSelect: (cell: StressMapCell) => void;
  readonly controllerRef: RendererRef;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<StressMapRenderer>();
  const options = useMemo<StressMapRendererOptions>(
    () => ({ selected, showGrid, showCoordinates }),
    [selected, showGrid, showCoordinates],
  );
  const initialOptionsRef = useRef(options);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const renderer = new StressMapRenderer(host, initialOptionsRef.current, onSelect);
    rendererRef.current = renderer;
    controllerRef.current = renderer;
    void renderer.init().then(() => {
      if (disposed) renderer.destroy();
    });
    return () => {
      disposed = true;
      if (rendererRef.current === renderer) rendererRef.current = undefined;
      if (controllerRef.current === renderer) controllerRef.current = undefined;
      renderer.destroy();
    };
  }, [controllerRef, onSelect]);

  useEffect(() => {
    rendererRef.current?.update(options);
  }, [options]);

  return (
    <div class="map-review-battlefield-wrap">
      <div class="map-review-battlefield" ref={hostRef} data-testid="stress-map-2p5d-host" />
      <div class="map-review-camera-note" aria-hidden="true">
        600-cell renderer stress · drag to pan · wheel/controls to zoom · rotate to inspect occlusion
      </div>
    </div>
  );
}

function BlueprintStressReview({
  selected,
  showCoordinates,
  onSelect,
}: {
  readonly selected: StressMapCell;
  readonly showCoordinates: boolean;
  readonly onSelect: (cell: StressMapCell) => void;
}) {
  const selectedKey = key(selected);
  const columns = Array.from({ length: STRESS_MAP_WIDTH }, (_, index) => index);
  const rows = Array.from({ length: STRESS_MAP_HEIGHT }, (_, index) => index);

  return (
    <div class="map-review-board-scroll">
      <div class="map-review-board map-stress-board" data-testid="stress-map-grid">
        <div class="map-review-axis map-review-axis-corner" aria-hidden="true" />
        {columns.map((x) => (
          <div class="map-review-axis map-review-axis-x" aria-hidden="true" key={`x-${x}`}>
            {String(x).padStart(2, "0")}
          </div>
        ))}
        {rows.map((y) => (
          <>
            <div class="map-review-axis map-review-axis-y" aria-hidden="true" key={`y-${y}`}>
              {String(y).padStart(2, "0")}
            </div>
            {columns.map((x) => {
              const cell = STRESS_MAP_BY_KEY.get(`${x},${y}`);
              if (!cell) return null;
              const cellKey = key(cell);
              const classes = [
                "map-review-cell",
                cell.blocked ? "is-blocked" : "is-passable",
                cell.terrain === "road" ? "is-road" : "",
                cell.elevation > 0 ? "is-elevated" : "",
                cell.elevation < 0 ? "is-depressed" : "",
                cellKey === selectedKey ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const elevation = `${cell.elevation >= 0 ? "+" : ""}${cell.elevation}`;
              const title = `(${x},${y}) ${cell.terrain} elevation ${elevation}${cell.blocked ? " blocked" : " passable"}`;
              return (
                <button
                  type="button"
                  class={classes}
                  data-testid={`stress-map-cell-${x}-${y}`}
                  aria-label={title}
                  title={title}
                  onClick={() => onSelect(cell)}
                  key={cellKey}
                >
                  {showCoordinates ? (
                    <span class="map-review-coordinate">
                      {x},{y}
                    </span>
                  ) : null}
                  <span class="map-review-elevation">{elevation}</span>
                </button>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

export function MapStressApp() {
  const [selected, setSelected] = useState<StressMapCell>({
    x: STRESS_MAP_MIN_SENTINEL.x,
    y: STRESS_MAP_MIN_SENTINEL.y,
  });
  const [mode, setMode] = useState<ReviewMode>("battlefield");
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(
    () => window.innerWidth >= 1000 && window.innerHeight >= 600,
  );
  const cameraRef = useRef<StressMapRenderer>();
  const selectedData = STRESS_MAP_BY_KEY.get(key(selected)) ?? STRESS_MAP_MIN_SENTINEL;

  return (
    <main class="map-review" aria-label="Large battlefield elevation stress review">
      <section class="map-review-stage" aria-label="Renderer stress battlefield">
        {mode === "battlefield" ? (
          <BattlefieldStressReview
            selected={selected}
            showGrid={showGrid}
            showCoordinates={showCoordinates}
            onSelect={setSelected}
            controllerRef={cameraRef}
          />
        ) : (
          <BlueprintStressReview
            selected={selected}
            showCoordinates={showCoordinates}
            onSelect={setSelected}
          />
        )}
      </section>

      <header class="map-review-topbar">
        <div class="map-review-title">
          <span class="map-review-kicker">GAME-MAP05 · developer renderer stress</span>
          <h1>Extreme Elevation Stress Map</h1>
          <span class="map-review-warning">NON-CANONICAL · 30×20 · ELEVATION −7…+7</span>
        </div>

        <fieldset class="map-review-mode-switch">
          <legend class="map-review-mode-legend">Review mode</legend>
          <button
            type="button"
            class={mode === "battlefield" ? "is-active" : ""}
            aria-pressed={mode === "battlefield"}
            onClick={() => setMode("battlefield")}
          >
            Battlefield
          </button>
          <button
            type="button"
            class={mode === "blueprint" ? "is-active" : ""}
            aria-pressed={mode === "blueprint"}
            onClick={() => setMode("blueprint")}
          >
            Blueprint
          </button>
        </fieldset>

        {mode === "battlefield" ? (
          <fieldset class="map-review-camera-controls">
            <legend class="map-review-mode-legend">Stress map camera controls</legend>
            <button type="button" aria-label="Rotate left" onClick={() => cameraRef.current?.rotateLeft()}>
              ↺
            </button>
            <button type="button" aria-label="Rotate right" onClick={() => cameraRef.current?.rotateRight()}>
              ↻
            </button>
            <button type="button" aria-label="Zoom out" onClick={() => cameraRef.current?.zoomOut()}>
              −
            </button>
            <button type="button" aria-label="Zoom in" onClick={() => cameraRef.current?.zoomIn()}>
              +
            </button>
            <button type="button" aria-label="Fit map" onClick={() => cameraRef.current?.fit()}>
              Fit
            </button>
          </fieldset>
        ) : null}

        <button
          type="button"
          class="map-review-details-toggle"
          aria-expanded={detailsOpen}
          aria-controls="map-stress-details"
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? "Hide details" : "Details"}
        </button>
      </header>

      {detailsOpen ? (
        <aside id="map-stress-details" class="map-review-details" aria-label="Stress map details">
          <section class="map-review-inspector" aria-live="polite">
            <p class="map-review-kicker">Selected cell</p>
            <h2 data-testid="stress-selected-coordinate">
              ({selectedData.x}, {selectedData.y})
            </h2>
            <p class="map-review-selected-label" data-testid="stress-selected-elevation">
              Elevation {selectedData.elevation >= 0 ? "+" : ""}{selectedData.elevation}
            </p>
            <ul>
              <li>{selectedData.terrain}</li>
              <li>{selectedData.blocked ? "Blocked" : "Passable"}</li>
              <li>Absolute vertical offset: {selectedData.elevation * 24}px at native projection scale</li>
            </ul>
          </section>

          <section class="map-review-layers" aria-label="Stress review layers">
            {mode === "battlefield" ? (
              <label>
                <input
                  type="checkbox"
                  checked={showGrid}
                  onChange={(event) => setShowGrid(event.currentTarget.checked)}
                />
                Grid
              </label>
            ) : null}
            <label>
              <input
                type="checkbox"
                checked={showCoordinates}
                onChange={(event) => setShowCoordinates(event.currentTarget.checked)}
              />
              Coordinates + elevation
            </label>
          </section>

          <section class="map-review-legend">
            <h2>Stress envelope</h2>
            <p>30×20 = {STRESS_MAP_CELLS.length} logical cells.</p>
            <p>
              Elevation range {STRESS_MAP_MIN_ELEVATION}…+{STRESS_MAP_MAX_ELEVATION}; projected vertical span is 336px before tile geometry.
            </p>
            <p data-testid="stress-min-sentinel">
              −7 sentinel: ({STRESS_MAP_MIN_SENTINEL.x}, {STRESS_MAP_MIN_SENTINEL.y})
            </p>
            <p data-testid="stress-max-sentinel">
              +7 sentinel: ({STRESS_MAP_MAX_SENTINEL.x}, {STRESS_MAP_MAX_SENTINEL.y})
            </p>
          </section>

          <footer class="map-review-footer">
            Developer-only renderer/projection fixture. It is not encounter content, is not GAME-D222 compliant, and does not alter CH01-B01 or production routing.
          </footer>
        </aside>
      ) : null}
    </main>
  );
}
