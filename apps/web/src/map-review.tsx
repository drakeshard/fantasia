import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import layout from "../../../content/encounters/candidates/ch01-b01.layout-candidate.json";
import {
  type MapReviewCell,
  MapReviewRenderer,
  type MapReviewRendererOptions,
} from "./map-review-renderer";

type Cell = MapReviewCell;
type Deployment = (typeof layout.deployment.initial)[number];
type Reinforcement = (typeof layout.deployment.reinforcements)[number];
type ReviewMode = "battlefield" | "blueprint";

interface RendererRef {
  current: MapReviewRenderer | undefined;
}

function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

function includesCell(cells: readonly Cell[], cell: Cell): boolean {
  const key = cellKey(cell);
  return cells.some((candidate) => cellKey(candidate) === key);
}

function initialAt(cell: Cell): Deployment | undefined {
  return layout.deployment.initial.find((entry) => cellKey(entry.cell) === cellKey(cell));
}

function reinforcementAt(cell: Cell): Reinforcement | undefined {
  return layout.deployment.reinforcements.find(
    (entry) => cellKey(entry.entryCell) === cellKey(cell),
  );
}

function regionNames(cell: Cell): string[] {
  return layout.environmentIntent.functionalRegions
    .filter((region) => includesCell(region.cells, cell))
    .map((region) => region.id);
}

function markerFor(cell: Cell): string | undefined {
  const initial = initialAt(cell);
  if (initial) {
    if (initial.id === "mc") return "M";
    if (initial.id === "julie") return "J";
    if (initial.id.startsWith("local-escort")) return "E";
    if (initial.id.startsWith("civilian")) return "c";
    if (initial.id.startsWith("forager")) return "f";
  }
  const reinforcement = reinforcementAt(cell);
  if (reinforcement?.id === "hangaku") return "?";
  if (reinforcement?.id === "la-hire") return "?";
  if (reinforcement?.id.startsWith("forager-reinforcement")) return "r";
  return undefined;
}

function labelFor(cell: Cell): string {
  const initial = initialAt(cell);
  if (initial) return initial.label;
  const reinforcement = reinforcementAt(cell);
  if (reinforcement) {
    return "knowledgeLabel" in reinforcement && reinforcement.knowledgeLabel
      ? reinforcement.knowledgeLabel
      : "label" in reinforcement && reinforcement.label
        ? reinforcement.label
        : reinforcement.id;
  }
  return "Empty cell";
}

function BattlefieldReview({
  selected,
  showGrid,
  showCoordinates,
  showRoute,
  showUnits,
  onSelect,
  controllerRef,
}: {
  readonly selected: Cell;
  readonly showGrid: boolean;
  readonly showCoordinates: boolean;
  readonly showRoute: boolean;
  readonly showUnits: boolean;
  readonly onSelect: (cell: Cell) => void;
  readonly controllerRef: RendererRef;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapReviewRenderer | undefined>(undefined);
  const options = useMemo<MapReviewRendererOptions>(
    () => ({ selected, showGrid, showCoordinates, showRoute, showUnits }),
    [selected, showGrid, showCoordinates, showRoute, showUnits],
  );
  const initialOptionsRef = useRef(options);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    const renderer = new MapReviewRenderer(host, initialOptionsRef.current, onSelect);
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
      <div class="map-review-battlefield" ref={hostRef} data-testid="b01-map-2p5d-host" />
      <div class="map-review-camera-note" aria-hidden="true">
        Drag to pan · wheel or controls to zoom · rotation is presentation-only
      </div>
    </div>
  );
}

function BlueprintReview({
  selected,
  showRoute,
  showUnits,
  showCoordinates,
  blocked,
  elevations,
  route,
  routeFootprint,
  exit,
  road,
  onSelect,
}: {
  readonly selected: Cell;
  readonly showRoute: boolean;
  readonly showUnits: boolean;
  readonly showCoordinates: boolean;
  readonly blocked: ReadonlySet<string>;
  readonly elevations: ReadonlyMap<string, number>;
  readonly route: ReadonlySet<string>;
  readonly routeFootprint: ReadonlySet<string>;
  readonly exit: ReadonlySet<string>;
  readonly road: ReadonlySet<string>;
  readonly onSelect: (cell: Cell) => void;
}) {
  const columns = Array.from(
    { length: layout.bounds.maxX - layout.bounds.minX + 1 },
    (_, index) => layout.bounds.minX + index,
  );
  const rows = Array.from(
    { length: layout.bounds.maxY - layout.bounds.minY + 1 },
    (_, index) => layout.bounds.minY + index,
  );
  const selectedKey = cellKey(selected);

  return (
    <div class="map-review-board-scroll">
      <div class="map-review-board" data-testid="b01-map-grid">
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
              const key = cellKey(cell);
              const elevation = elevations.get(key) ?? 0;
              const marker = showUnits ? markerFor(cell) : undefined;
              const classes = [
                "map-review-cell",
                blocked.has(key) ? "is-blocked" : "is-passable",
                elevation > 0 ? "is-elevated" : "",
                road.has(key) ? "is-road" : "",
                showRoute && routeFootprint.has(key) ? "is-cart-clearance" : "",
                showRoute && route.has(key) ? "is-cart-anchor" : "",
                showRoute && exit.has(key) ? "is-exit" : "",
                key === selectedKey ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const title = `(${x},${y}) ${labelFor(cell)}${elevation ? ` elevation +${elevation}` : ""}`;
              return (
                <button
                  type="button"
                  class={classes}
                  data-testid={`map-cell-${x}-${y}`}
                  aria-label={title}
                  title={title}
                  onClick={() => onSelect(cell)}
                  key={key}
                >
                  {showCoordinates ? (
                    <span class="map-review-coordinate">
                      {x},{y}
                    </span>
                  ) : null}
                  {elevation > 0 ? <span class="map-review-elevation">+{elevation}</span> : null}
                  {marker ? <strong class="map-review-marker">{marker}</strong> : null}
                </button>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

export function MapReviewApp() {
  const [selected, setSelected] = useState<Cell>(layout.cart.startAnchor);
  const [mode, setMode] = useState<ReviewMode>("battlefield");
  const [showRoute, setShowRoute] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(
    () => window.innerWidth >= 1000 && window.innerHeight >= 600,
  );
  const cameraRef = useRef<MapReviewRenderer | undefined>(undefined);

  const blocked = useMemo(
    () => new Set(layout.terrain.blockedCells.map((cell) => cellKey(cell))),
    [],
  );
  const elevations = useMemo(
    () => new Map(layout.terrain.elevationCells.map((cell) => [cellKey(cell), cell.level])),
    [],
  );
  const route = useMemo(() => new Set(layout.cart.routeAnchors.map((cell) => cellKey(cell))), []);
  const routeFootprint = useMemo(() => {
    const keys = new Set<string>();
    for (const anchor of layout.cart.routeAnchors) {
      keys.add(cellKey(anchor));
      keys.add(cellKey({ x: anchor.x + 1, y: anchor.y }));
    }
    return keys;
  }, []);
  const exit = useMemo(() => new Set(layout.cart.exitZone.map((cell) => cellKey(cell))), []);
  const road = useMemo(() => {
    const keys = new Set<string>();
    for (const region of layout.environmentIntent.functionalRegions) {
      if (["west-approach", "central-road", "east-bend"].includes(region.id)) {
        for (const cell of region.cells) keys.add(cellKey(cell));
      }
    }
    return keys;
  }, []);

  const selectedKey = cellKey(selected);
  const selectedInitial = initialAt(selected);
  const selectedReinforcement = reinforcementAt(selected);
  const selectedRegions = regionNames(selected);
  const selectedElevation = elevations.get(selectedKey) ?? 0;
  const selectedFacts = [
    blocked.has(selectedKey) ? "Blocked" : "Passable",
    selectedElevation > 0 ? `Elevation +${selectedElevation}` : "Elevation 0",
    road.has(selectedKey) ? "Road/approach region" : undefined,
    route.has(selectedKey) ? "Cart route anchor" : undefined,
    routeFootprint.has(selectedKey) ? "Inside tested 2×1 cart clearance" : undefined,
    exit.has(selectedKey) ? "East exit zone" : undefined,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <main class="map-review" aria-label="CH01-B01 candidate map review">
      <section class="map-review-stage" aria-label="Candidate battlefield">
        {mode === "battlefield" ? (
          <BattlefieldReview
            selected={selected}
            showGrid={showGrid}
            showCoordinates={showCoordinates}
            showRoute={showRoute}
            showUnits={showUnits}
            onSelect={setSelected}
            controllerRef={cameraRef}
          />
        ) : (
          <BlueprintReview
            selected={selected}
            showRoute={showRoute}
            showUnits={showUnits}
            showCoordinates={showCoordinates}
            blocked={blocked}
            elevations={elevations}
            route={route}
            routeFootprint={routeFootprint}
            exit={exit}
            road={road}
            onSelect={setSelected}
          />
        )}
      </section>

      <header class="map-review-topbar">
        <div class="map-review-title">
          <span class="map-review-kicker">{layout.stageId} · developer review</span>
          <h1>{layout.title}</h1>
          <span class="map-review-warning">PROVISIONAL · NOT GAME-D222 COMPLIANT</span>
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
          aria-controls="map-review-details"
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? "Hide details" : "Details"}
        </button>
      </header>

      {detailsOpen ? (
        <aside id="map-review-details" class="map-review-details" aria-label="Map review details">
          <section class="map-review-inspector" aria-live="polite">
            <p class="map-review-kicker">Selected cell</p>
            <h2 data-testid="selected-coordinate">
              ({selected.x}, {selected.y})
            </h2>
            <p class="map-review-selected-label" data-testid="selected-label">
              {selectedInitial?.label ??
                (selectedReinforcement && "knowledgeLabel" in selectedReinforcement
                  ? selectedReinforcement.knowledgeLabel
                  : selectedReinforcement && "label" in selectedReinforcement
                    ? selectedReinforcement.label
                    : "No deployment")}
            </p>
            <ul>
              {selectedFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
            {selectedRegions.length > 0 ? (
              <p>
                <strong>Regions:</strong> {selectedRegions.join(", ")}
              </p>
            ) : null}
            {selectedInitial && "storyConstraint" in selectedInitial ? (
              <p>
                <strong>Story constraint:</strong> {selectedInitial.storyConstraint}
              </p>
            ) : null}
            {selectedReinforcement ? (
              <p>
                <strong>Entry phase:</strong> {selectedReinforcement.phase} ·{" "}
                {selectedReinforcement.beatId}
              </p>
            ) : null}
            {selectedReinforcement && "note" in selectedReinforcement ? (
              <p>{selectedReinforcement.note}</p>
            ) : null}
          </section>

          <section class="map-review-layers" aria-label="Review layers">
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
                checked={showRoute}
                onChange={(event) => setShowRoute(event.currentTarget.checked)}
              />
              Cart route + exit
            </label>
            <label>
              <input
                type="checkbox"
                checked={showUnits}
                onChange={(event) => setShowUnits(event.currentTarget.checked)}
              />
              Deployments + entries
            </label>
            <label>
              <input
                type="checkbox"
                checked={showCoordinates}
                onChange={(event) => setShowCoordinates(event.currentTarget.checked)}
              />
              Coordinates
            </label>
          </section>

          <section class="map-review-legend" aria-label="Map legend">
            <h2>Legend</h2>
            <span>
              <i class="legend-road" /> road/approach
            </span>
            <span>
              <i class="legend-blocked" /> woodland / blocked
            </span>
            <span>
              <i class="legend-ridge" /> +1 ridge
            </span>
            <span>
              <i class="legend-cart" /> cart clearance
            </span>
            <span>
              <i class="legend-exit" /> exit
            </span>
            <p>Allies · protected civilians · enemies · outlined entry markers</p>
          </section>

          <section class="map-review-phases" aria-label="Story phase geometry notes">
            <h2>Battle beat geometry</h2>
            {layout.phaseAnnotations.map((phase) => (
              <article key={phase.beatId}>
                <strong>{phase.beatId}</strong>
                <p>{phase.geometryIntent}</p>
              </article>
            ))}
          </section>

          <footer class="map-review-footer">
            <strong>Geometry review only.</strong> Camera pan, zoom and rotation are
            non-authoritative. Cart/civilian mechanics, phase triggers, victory/failure, AI and
            balance remain unresolved.
          </footer>
        </aside>
      ) : null}
    </main>
  );
}
