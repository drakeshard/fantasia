import { useMemo, useState } from "preact/hooks";
import layout from "../../../content/encounters/candidates/ch01-b01.layout-candidate.json";

type Cell = { readonly x: number; readonly y: number };
type Deployment = (typeof layout.deployment.initial)[number];
type Reinforcement = (typeof layout.deployment.reinforcements)[number];

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
  if (reinforcement?.id === "hangaku") return "H";
  if (reinforcement?.id === "la-hire") return "L";
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

export function MapReviewApp() {
  const [selected, setSelected] = useState<Cell>(layout.cart.startAnchor);
  const [showRoute, setShowRoute] = useState(true);
  const [showUnits, setShowUnits] = useState(true);
  const [showCoordinates, setShowCoordinates] = useState(true);

  const blocked = useMemo(
    () => new Set(layout.terrain.blockedCells.map((cell) => cellKey(cell))),
    [],
  );
  const elevations = useMemo(
    () => new Map(layout.terrain.elevationCells.map((cell) => [cellKey(cell), cell.level])),
    [],
  );
  const route = useMemo(
    () => new Set(layout.cart.routeAnchors.map((cell) => cellKey(cell))),
    [],
  );
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

  const columns = Array.from(
    { length: layout.bounds.maxX - layout.bounds.minX + 1 },
    (_, index) => layout.bounds.minX + index,
  );
  const rows = Array.from(
    { length: layout.bounds.maxY - layout.bounds.minY + 1 },
    (_, index) => layout.bounds.minY + index,
  );

  return (
    <main class="map-review" aria-label="CH01-B01 candidate map review">
      <header class="map-review-header">
        <div>
          <p class="map-review-kicker">Developer visual review · {layout.stageId}</p>
          <h1>{layout.title}</h1>
          <p class="map-review-warning">
            PROVISIONAL LAYOUT CANDIDATE — not production gameplay and not GAME-D222 compliant.
          </p>
        </div>
        <div class="map-review-status" aria-label="Candidate status">
          <strong>18 × 12</strong>
          <span>2D authoritative geometry review</span>
        </div>
      </header>

      <section class="map-review-toolbar" aria-label="Map layers">
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

      <div class="map-review-layout">
        <section class="map-review-board-panel" aria-label="Candidate battlefield">
          <div class="map-review-board-scroll">
            <div
              class="map-review-board"
              style={{ "--map-columns": String(columns.length) }}
              data-testid="b01-map-grid"
            >
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
                        onClick={() => setSelected(cell)}
                        key={key}
                      >
                        {showCoordinates ? <span class="map-review-coordinate">{x},{y}</span> : null}
                        {elevation > 0 ? <span class="map-review-elevation">+{elevation}</span> : null}
                        {marker ? <strong class="map-review-marker">{marker}</strong> : null}
                      </button>
                    );
                  })}
                </>
              ))}
            </div>
          </div>

          <div class="map-review-legend" aria-label="Map legend">
            <span><i class="legend-road" /> road/approach</span>
            <span><i class="legend-blocked" /> blocked</span>
            <span><i class="legend-ridge" /> +1 ridge</span>
            <span><i class="legend-cart" /> cart clearance</span>
            <span><i class="legend-exit" /> exit</span>
            <span><b>M</b> MC · <b>J</b> Julie · <b>H</b> Hangaku · <b>L</b> La Hire · <b>f/r</b> enemies</span>
          </div>
        </section>

        <aside class="map-review-inspector" aria-live="polite">
          <p class="map-review-kicker">Selected cell</p>
          <h2 data-testid="selected-coordinate">({selected.x}, {selected.y})</h2>
          <p class="map-review-selected-label" data-testid="selected-label">
            {selectedInitial?.label ??
              (selectedReinforcement && "knowledgeLabel" in selectedReinforcement
                ? selectedReinforcement.knowledgeLabel
                : selectedReinforcement && "label" in selectedReinforcement
                  ? selectedReinforcement.label
                  : "No deployment")}
          </p>
          <ul>
            {selectedFacts.map((fact) => <li key={fact}>{fact}</li>)}
          </ul>
          {selectedRegions.length > 0 ? (
            <p><strong>Regions:</strong> {selectedRegions.join(", ")}</p>
          ) : null}
          {selectedInitial && "storyConstraint" in selectedInitial ? (
            <p><strong>Story constraint:</strong> {selectedInitial.storyConstraint}</p>
          ) : null}
          {selectedReinforcement ? (
            <p><strong>Entry phase:</strong> {selectedReinforcement.phase} · {selectedReinforcement.beatId}</p>
          ) : null}
          {selectedReinforcement && "note" in selectedReinforcement ? (
            <p>{selectedReinforcement.note}</p>
          ) : null}
        </aside>
      </div>

      <section class="map-review-phases" aria-label="Story phase geometry notes">
        <h2>Battle beat geometry</h2>
        <div>
          {layout.phaseAnnotations.map((phase) => (
            <article key={phase.beatId}>
              <strong>{phase.beatId}</strong>
              <p>{phase.geometryIntent}</p>
            </article>
          ))}
        </div>
      </section>

      <footer class="map-review-footer">
        <strong>Review purpose:</strong> approve, correct, or reject geometry only. Cart/civilian mechanics,
        phase triggers, victory/failure, AI and balance remain unresolved.
      </footer>
    </main>
  );
}
