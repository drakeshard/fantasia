import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import {
  authoredSceneToBattlefieldFrame,
  battlefieldCellKey,
  type BattlefieldRenderCell,
} from "./battlefield-engine.js";
import {
  BATTLEFIELD_VIEWER_FIXTURES,
  REFERENCE_BATTLEFIELD_FIXTURE,
  type BattlefieldViewerFixture,
} from "./battlefield-fixtures.js";
import { BattlefieldRenderer } from "./battlefield-renderer.js";

function fixtureFromLocation(): BattlefieldViewerFixture {
  const requested = new URLSearchParams(window.location.search).get("fixture");
  return (
    BATTLEFIELD_VIEWER_FIXTURES.find((fixture) => fixture.id === requested) ??
    REFERENCE_BATTLEFIELD_FIXTURE
  );
}

export function BattlefieldViewerApp() {
  const [fixture, setFixture] = useState<BattlefieldViewerFixture>(fixtureFromLocation);
  const [selected, setSelected] = useState(fixture.focusCell);
  const [showGrid, setShowGrid] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<BattlefieldRenderer | null>(null);
  const frame = useMemo(() => authoredSceneToBattlefieldFrame(fixture.scene), [fixture]);
  const selectedCell = frame.cells.find(
    (cell) => battlefieldCellKey(cell) === battlefieldCellKey(selected),
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const renderer = new BattlefieldRenderer(
      host,
      {
        testId: "battlefield-viewer-canvas",
        ariaLabel: "Fantasia standardized battlefield developer viewer",
        interactiveCamera: true,
      },
      {
        onCellActivate: (cell) => setSelected({ x: cell.x, y: cell.y }),
      },
    );
    rendererRef.current = renderer;
    renderer.update(frame, {
      selectedCell: selected,
      showGrid,
      showCoordinates,
      showUnits: fixture.showUnits,
    });
    void renderer.init();
    return () => {
      rendererRef.current = null;
      renderer.destroy();
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.update(frame, {
      selectedCell: selected,
      showGrid,
      showCoordinates,
      showUnits: fixture.showUnits,
    });
  }, [fixture.showUnits, frame, selected, showCoordinates, showGrid]);

  function chooseFixture(next: BattlefieldViewerFixture): void {
    const url = new URL(window.location.href);
    url.searchParams.set("dev", "battlefield");
    if (next.kind === "reference") url.searchParams.delete("fixture");
    else url.searchParams.set("fixture", next.id);
    window.history.replaceState({}, "", url);
    setFixture(next);
    setSelected(next.focusCell);
  }

  function selectedSummary(cell: BattlefieldRenderCell | undefined): string {
    if (!cell) return "No cell selected";
    const flags = [
      cell.blocked ? "blocked" : undefined,
      cell.reachable ? "reachable" : undefined,
      cell.path ? "route" : undefined,
    ].filter(Boolean);
    return `${cell.x}, ${cell.y} · elevation ${cell.elevation} · ${cell.terrainVisualId}${
      flags.length ? ` · ${flags.join(", ")}` : ""
    }`;
  }

  return (
    <main class="map-review environment-scenes" aria-label="Fantasia battlefield developer viewer">
      <section class="map-review-stage environment-scenes-stage" aria-label={fixture.title}>
        <div class="map-review-battlefield-wrap environment-scene-battlefield">
          <div
            class="map-review-battlefield"
            ref={hostRef}
            data-testid="battlefield-viewer-host"
            data-fixture-id={fixture.id}
            data-fixture-kind={fixture.kind}
            data-cell-count={frame.cells.length}
          />
          <div class="map-review-camera-note" aria-hidden="true">
            Drag to pan · wheel or controls to zoom · rotation is presentation-only
          </div>
        </div>
      </section>

      <header class="map-review-topbar environment-scenes-topbar">
        <div class="map-review-title environment-scenes-title">
          <span class="map-review-kicker">{fixture.kicker}</span>
          <strong>{fixture.title}</strong>
          <span>{fixture.description}</span>
        </div>
        <nav class="map-review-mode-switch" aria-label="Battlefield fixtures">
          {BATTLEFIELD_VIEWER_FIXTURES.map((candidate) => (
            <button
              type="button"
              class={candidate.id === fixture.id ? "is-active" : undefined}
              data-testid={`battlefield-fixture-${candidate.id}`}
              onClick={() => chooseFixture(candidate)}
            >
              {candidate.kind === "stress" ? `Stress: ${candidate.title}` : candidate.title}
            </button>
          ))}
        </nav>
      </header>

      <aside class="map-review-details environment-scenes-panel" aria-label="Battlefield diagnostics">
        <span class="map-review-kicker">Standardized Engine</span>
        <h2>{fixture.kind === "stress" ? "Stress fixture" : "Reference fixture"}</h2>
        <p data-testid="battlefield-selected-cell">{selectedSummary(selectedCell)}</p>
        <dl class="environment-scene-stats">
          <div><dt>Cells</dt><dd data-testid="battlefield-cell-count">{frame.cells.length}</dd></div>
          <div><dt>Units</dt><dd>{frame.units.length}</dd></div>
          <div><dt>Contract</dt><dd>render frame</dd></div>
          <div><dt>Timing probe</dt><dd>none</dd></div>
        </dl>
        <div class="map-review-camera-controls" aria-label="Camera controls">
          <button type="button" data-testid="battlefield-rotate-left" onClick={() => rendererRef.current?.rotateLeft()}>↶</button>
          <button type="button" data-testid="battlefield-zoom-out" onClick={() => rendererRef.current?.zoomOut()}>−</button>
          <button type="button" data-testid="battlefield-fit" onClick={() => rendererRef.current?.fit()}>Fit</button>
          <button type="button" data-testid="battlefield-zoom-in" onClick={() => rendererRef.current?.zoomIn()}>+</button>
          <button type="button" data-testid="battlefield-rotate-right" onClick={() => rendererRef.current?.rotateRight()}>↷</button>
        </div>
        <label><input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.currentTarget.checked)} /> Grid</label>
        <label><input type="checkbox" checked={showCoordinates} onChange={(event) => setShowCoordinates(event.currentTarget.checked)} /> Coordinates</label>
      </aside>
    </main>
  );
}
