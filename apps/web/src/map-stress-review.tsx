import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  type MapReviewCell,
  MapReviewRenderer,
  type MapReviewRendererOptions,
  type MapReviewRendererScene,
} from "./map-review-renderer";

type Cell = MapReviewCell;
type ReviewMode = "battlefield" | "blueprint";

interface RendererRef {
  current: MapReviewRenderer | undefined;
}

const WIDTH = 30;
const HEIGHT = 20;
const BOUNDS = { minX: 0, maxX: WIDTH - 1, minY: 0, maxY: HEIGHT - 1 } as const;

function key(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

function elevationAt(x: number, y: number): number {
  const basinDistance = Math.abs(x - 5) + Math.abs(y - 15);
  if (basinDistance <= 6) return -7 + basinDistance;

  if (x >= 22 && x <= 29 && y >= 1 && y <= 8) {
    const ring = Math.min(x - 22, 29 - x, y - 1, 8 - y);
    return Math.min(7, 4 + ring);
  }
  if (x >= 20 && x <= 21 && y >= 2 && y <= 9) return 2 + (x - 20);
  if (x >= 22 && x <= 28 && (y === 0 || y === 9)) return 3;

  if (x >= 12 && x <= 18 && y >= 5 && y <= 12) {
    const dx = Math.abs(x - 15);
    const dy = Math.abs(y - 8);
    return Math.max(1, 4 - Math.min(3, Math.floor(dx / 2) + Math.floor(dy / 2)));
  }

  if (x < 12 && y >= 10) return -1;
  if (x >= 18 && y >= 11) return 1 + ((x + y) % 2);
  return 0;
}

const ALL_CELLS = Array.from({ length: HEIGHT }, (_, y) =>
  Array.from({ length: WIDTH }, (_, x) => ({ x, y })),
).flat();
const ELEVATION_CELLS = ALL_CELLS.map((cell) => ({
  ...cell,
  level: elevationAt(cell.x, cell.y),
}));
const BLOCKED_CELLS = ALL_CELLS.filter(
  ({ x, y }) =>
    ((x * 7 + y * 11) % 23 === 0 && !(x >= 2 && x <= 27 && y >= 8 && y <= 10)) ||
    (x >= 2 && x <= 4 && y >= 2 && y <= 5) ||
    (x >= 10 && x <= 11 && y >= 13 && y <= 17),
);
const ROAD_CELLS = ALL_CELLS.filter(({ x, y }) => y >= 8 && y <= 10 && x >= 1 && x <= 28);
const BASIN_CELLS = ELEVATION_CELLS.filter(({ level }) => level < 0).map(({ x, y }) => ({
  x,
  y,
}));
const PLATEAU_CELLS = ELEVATION_CELLS.filter(({ level }) => level >= 4).map(({ x, y }) => ({
  x,
  y,
}));
const RIDGE_CELLS = ELEVATION_CELLS.filter(
  ({ x, y, level }) => level > 0 && x >= 12 && x <= 18 && y >= 5 && y <= 12,
).map(({ x, y }) => ({ x, y }));

const SCENE: MapReviewRendererScene = {
  bounds: BOUNDS,
  blockedCells: BLOCKED_CELLS,
  elevationCells: ELEVATION_CELLS,
  terrainRegions: [
    { kind: "road", cells: ROAD_CELLS },
    { kind: "basin", cells: BASIN_CELLS },
    { kind: "plateau", cells: PLATEAU_CELLS },
    { kind: "ridge", cells: RIDGE_CELLS },
  ],
  routeAnchors: [],
  routeClearanceCells: [],
  exitZone: [],
  units: [],
  testIdPrefix: "stress-map-2p5d",
  ariaLabel: "GAME-MAP05 interactive 2.5D non-canonical battlefield stress review",
};

function signed(level: number): string {
  return level > 0 ? `+${level}` : String(level);
}

function BattlefieldReview({
  selected,
  showGrid,
  showCoordinates,
  onSelect,
  controllerRef,
}: {
  readonly selected: Cell;
  readonly showGrid: boolean;
  readonly showCoordinates: boolean;
  readonly onSelect: (cell: Cell) => void;
  readonly controllerRef: RendererRef;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapReviewRenderer | undefined>(undefined);
  const options = useMemo<MapReviewRendererOptions>(
    () => ({ selected, showGrid, showCoordinates, showRoute: false, showUnits: false }),
    [selected, showGrid, showCoordinates],
  );
  const initialOptionsRef = useRef(options);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const renderer = new MapReviewRenderer(host, initialOptionsRef.current, onSelect, SCENE);
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
        30×20 stress fixture · drag to pan · wheel or controls to zoom · rotation is
        presentation-only
      </div>
    </div>
  );
}

function BlueprintReview({
  selected,
  showCoordinates,
  onSelect,
}: {
  readonly selected: Cell;
  readonly showCoordinates: boolean;
  readonly onSelect: (cell: Cell) => void;
}) {
  const blocked = useMemo(() => new Set(BLOCKED_CELLS.map(key)), []);
  return (
    <div class="map-review-board-scroll">
      <div
        class="map-review-board map-stress-board"
        data-testid="stress-map-grid"
        style={{ gridTemplateColumns: `28px repeat(${WIDTH}, var(--map-cell))` }}
      >
        <div class="map-review-axis map-review-axis-corner" aria-hidden="true" />
        {Array.from({ length: WIDTH }, (_, x) => (
          <div class="map-review-axis map-review-axis-x" aria-hidden="true" key={`x-${x}`}>
            {String(x).padStart(2, "0")}
          </div>
        ))}
        {Array.from({ length: HEIGHT }, (_, y) => (
          <>
            <div class="map-review-axis map-review-axis-y" aria-hidden="true" key={`y-${y}`}>
              {String(y).padStart(2, "0")}
            </div>
            {Array.from({ length: WIDTH }, (_, x) => {
              const cell = { x, y };
              const elevation = elevationAt(x, y);
              const selectedCell = key(selected) === key(cell);
              const classes = [
                "map-review-cell",
                blocked.has(key(cell)) ? "is-blocked" : "is-passable",
                elevation > 0 ? "is-elevated" : "",
                selectedCell ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <button
                  type="button"
                  class={classes}
                  data-testid={`stress-map-cell-${x}-${y}`}
                  aria-label={`(${x},${y}) elevation ${signed(elevation)}`}
                  title={`(${x},${y}) elevation ${signed(elevation)}`}
                  onClick={() => onSelect(cell)}
                  key={key(cell)}
                >
                  {showCoordinates ? (
                    <span class="map-review-coordinate">
                      {x},{y}
                    </span>
                  ) : null}
                  <span class="map-review-elevation">{signed(elevation)}</span>
                </button>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

export function MapStressReviewApp() {
  const [selected, setSelected] = useState<Cell>({ x: 5, y: 15 });
  const [mode, setMode] = useState<ReviewMode>("battlefield");
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(
    () => window.innerWidth >= 1000 && window.innerHeight >= 600,
  );
  const cameraRef = useRef<MapReviewRenderer | undefined>(undefined);
  const elevation = elevationAt(selected.x, selected.y);
  const blocked = useMemo(() => new Set(BLOCKED_CELLS.map(key)), []);

  return (
    <main class="map-review" aria-label="GAME-MAP05 non-canonical battlefield stress review">
      <section class="map-review-stage" aria-label="Stress battlefield">
        {mode === "battlefield" ? (
          <BattlefieldReview
            selected={selected}
            showGrid={showGrid}
            showCoordinates={showCoordinates}
            onSelect={setSelected}
            controllerRef={cameraRef}
          />
        ) : (
          <BlueprintReview
            selected={selected}
            showCoordinates={showCoordinates}
            onSelect={setSelected}
          />
        )}
      </section>

      <header class="map-review-topbar">
        <div class="map-review-title">
          <span class="map-review-kicker">GAME-MAP05 · developer stress fixture</span>
          <h1>Elevation Extremes</h1>
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
        <aside
          id="map-stress-details"
          class="map-review-details"
          aria-label="Stress map review details"
        >
          <section class="map-review-inspector" aria-live="polite">
            <p class="map-review-kicker">Selected cell</p>
            <h2 data-testid="stress-selected-coordinate">
              ({selected.x}, {selected.y})
            </h2>
            <p class="map-review-selected-label" data-testid="stress-selected-elevation">
              Elevation {signed(elevation)}
            </p>
            <ul>
              <li>{blocked.has(key(selected)) ? "Blocked" : "Passable"}</li>
              <li>Deterministic 30×20 / 600-cell fixture</li>
              <li>Logical range −7 through +7</li>
              <li>Rendering stress only; no movement/climb/drop rule is implied</li>
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
              Coordinates
            </label>
          </section>

          <section class="map-review-legend" aria-label="Stress map legend">
            <h2>Fixture coverage</h2>
            <span>Low basin / depression</span>
            <span>Stepped central ridge</span>
            <span>High plateau / cliffs</span>
            <span>Road + blocked woodland</span>
          </section>

          <footer class="map-review-footer">
            <strong>Non-canonical renderer fixture.</strong> It does not alter CH01-B01, approve map
            geometry, or enable production battle routing.
          </footer>
        </aside>
      ) : null}
    </main>
  );
}
