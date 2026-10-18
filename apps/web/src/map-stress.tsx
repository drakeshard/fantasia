import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  STRESS_BOUNDS,
  STRESS_CELL_COUNT,
  STRESS_HEIGHT,
  STRESS_MAX_ELEVATION,
  STRESS_MIN_ELEVATION,
  STRESS_WIDTH,
  type StressCell,
  stressCells,
  stressElevationAt,
  stressSignedElevation,
  stressTerrainLabel,
} from "./map-stress-data.js";
import {
  MapStressRenderer,
  type MapStressRendererOptions,
} from "./map-stress-renderer.js";

type ReviewMode = "battlefield" | "blueprint";

interface RendererRef {
  current: MapStressRenderer | undefined;
}

function BattlefieldStressReview({
  selected,
  showGrid,
  showCoordinates,
  onSelect,
  controllerRef,
}: {
  readonly selected: StressCell;
  readonly showGrid: boolean;
  readonly showCoordinates: boolean;
  readonly onSelect: (cell: StressCell) => void;
  readonly controllerRef: RendererRef;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapStressRenderer | undefined>(undefined);
  const options = useMemo<MapStressRendererOptions>(
    () => ({ selected, showGrid, showCoordinates }),
    [selected, showGrid, showCoordinates],
  );
  const initialOptionsRef = useRef(options);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const renderer = new MapStressRenderer(host, initialOptionsRef.current, onSelect);
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
      <div
        class="map-review-battlefield"
        ref={hostRef}
        data-testid="stress-map-2p5d-host"
      />
      <div class="map-review-camera-note" aria-hidden="true">
        32×24 stress field · drag to pan · wheel or controls to zoom · rotation is presentation-only
      </div>
    </div>
  );
}

function BlueprintStressReview({
  selected,
  showCoordinates,
  onSelect,
}: {
  readonly selected: StressCell;
  readonly showCoordinates: boolean;
  readonly onSelect: (cell: StressCell) => void;
}) {
  const columns = Array.from(
    { length: STRESS_WIDTH },
    (_, index) => STRESS_BOUNDS.minX + index,
  );
  const rows = Array.from(
    { length: STRESS_HEIGHT },
    (_, index) => STRESS_BOUNDS.minY + index,
  );

  return (
    <div class="map-review-board-scroll map-stress-board-scroll">
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
              const cell = { x, y };
              const elevation = stressElevationAt(cell);
              const signed = stressSignedElevation(elevation);
              const selectedCell = cell.x === selected.x && cell.y === selected.y;
              const elevationClass =
                elevation > 0 ? "is-stress-positive" : elevation < 0 ? "is-stress-negative" : "";
              return (
                <button
                  type="button"
                  class={`map-review-cell map-stress-cell ${elevationClass} ${selectedCell ? "is-selected" : ""}`}
                  data-testid={`stress-cell-${x}-${y}`}
                  aria-label={`(${x},${y}) elevation ${signed} ${stressTerrainLabel(elevation)}`}
                  title={`(${x},${y}) · ${stressTerrainLabel(elevation)} · elevation ${signed}`}
                  onClick={() => onSelect(cell)}
                  key={`${x},${y}`}
                >
                  {showCoordinates ? (
                    <span class="map-review-coordinate">
                      {x},{y}
                    </span>
                  ) : null}
                  <span class="map-review-elevation map-stress-elevation">{signed}</span>
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
  const [selected, setSelected] = useState<StressCell>({ x: 16, y: 12 });
  const [mode, setMode] = useState<ReviewMode>("battlefield");
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(
    () => window.innerWidth >= 1000 && window.innerHeight >= 600,
  );
  const cameraRef = useRef<MapStressRenderer | undefined>(undefined);

  const allCells = useMemo(() => stressCells(), []);
  const presentLevels = useMemo(
    () => [...new Set(allCells.map((cell) => stressElevationAt(cell)))].sort((a, b) => a - b),
    [allCells],
  );
  const selectedElevation = stressElevationAt(selected);
  const selectedSigned = stressSignedElevation(selectedElevation);
  const selectedNeighbors = [
    { x: selected.x + 1, y: selected.y },
    { x: selected.x - 1, y: selected.y },
    { x: selected.x, y: selected.y + 1 },
    { x: selected.x, y: selected.y - 1 },
  ].filter(
    (cell) =>
      cell.x >= STRESS_BOUNDS.minX &&
      cell.x <= STRESS_BOUNDS.maxX &&
      cell.y >= STRESS_BOUNDS.minY &&
      cell.y <= STRESS_BOUNDS.maxY,
  );
  const maxNeighborDelta = selectedNeighbors.reduce(
    (largest, neighbor) =>
      Math.max(largest, Math.abs(selectedElevation - stressElevationAt(neighbor))),
    0,
  );

  return (
    <main class="map-review map-stress-review" aria-label="Large terrain elevation stress review">
      <section class="map-review-stage" aria-label="Experimental large terrain stress field">
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
          <span class="map-review-kicker">GAME-MAP05 · developer stress review</span>
          <h1>Elevation Stress Field</h1>
          <span class="map-review-warning">
            EXPERIMENTAL · NON-CANONICAL · NOT GAME-D222 COMPLIANT
          </span>
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
            <legend class="map-review-mode-legend">Review camera controls</legend>
            <button
              type="button"
              aria-label="Rotate left"
              onClick={() => cameraRef.current?.rotateLeft()}
            >
              ↺
            </button>
            <button
              type="button"
              aria-label="Rotate right"
              onClick={() => cameraRef.current?.rotateRight()}
            >
              ↻
            </button>
            <button
              type="button"
              aria-label="Zoom out"
              onClick={() => cameraRef.current?.zoomOut()}
            >
              −
            </button>
            <button
              type="button"
              aria-label="Zoom in"
              onClick={() => cameraRef.current?.zoomIn()}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Fit map"
              onClick={() => cameraRef.current?.fit()}
            >
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
        <aside
          id="map-stress-details"
          class="map-review-details"
          aria-label="Terrain stress details"
        >
          <section class="map-review-inspector" aria-live="polite">
            <p class="map-review-kicker">Selected cell</p>
            <h2 data-testid="stress-selected-coordinate">
              ({selected.x}, {selected.y})
            </h2>
            <p class="map-review-selected-label" data-testid="stress-selected-elevation">
              Elevation {selectedSigned}
            </p>
            <ul>
              <li>{stressTerrainLabel(selectedElevation)}</li>
              <li>Largest cardinal neighbor delta: {maxNeighborDelta}</li>
              <li>Presentation-only terrain fixture</li>
            </ul>
          </section>

          <section class="map-review-layers" aria-label="Stress review layers">
            <h2>Review layers</h2>
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

          <section
            class="map-review-legend map-stress-summary"
            aria-label="Stress fixture summary"
          >
            <h2>Fixture</h2>
            <span>Grid</span>
            <strong>
              {STRESS_WIDTH}×{STRESS_HEIGHT}
            </strong>
            <span>Cells</span>
            <strong data-testid="stress-cell-count">{STRESS_CELL_COUNT}</strong>
            <span>Elevation</span>
            <strong>
              {STRESS_MIN_ELEVATION}…+{STRESS_MAX_ELEVATION}
            </strong>
            <span>Levels present</span>
            <strong data-testid="stress-level-count">{presentLevels.length}</strong>
            <p>
              All 15 integer levels from −7 through +7 are present. Vertical faces are based on
              neighbor-relative height differences, not a zero-elevation baseline.
            </p>
          </section>

          <section class="map-review-footer">
            <strong>Review boundary</strong>
            <p>
              This fixture tests renderer readability and camera behavior only. It defines no
              climb/drop rules, movement costs, cover, line of sight, encounter balance, story
              geography or production routing. CH01-B01 remains a separate provisional candidate
              under its existing owner gate.
            </p>
          </section>
        </aside>
      ) : null}
    </main>
  );
}
