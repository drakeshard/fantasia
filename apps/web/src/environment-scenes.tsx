import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { BattlefieldCellCoord } from "./battlefield-presentation.js";
import {
  CANYON_BLIZZARD_FRONTIER,
  ENVIRONMENT_SCENES,
  type EnvironmentSceneDefinition,
  terrainVisualIdAt,
  TWIN_ISLES_SHORE,
  weatherVisualIdAt,
} from "./environment-scenes-data.js";
import {
  MapReviewRenderer,
  type MapReviewRendererOptions,
} from "./map-review-renderer.js";

type Cell = BattlefieldCellCoord;

interface RendererRef {
  current: MapReviewRenderer | undefined;
}

function signed(level: number): string {
  return level > 0 ? `+${level}` : String(level);
}

function elevationAt(definition: EnvironmentSceneDefinition, cell: Cell): number {
  return (
    definition.scene.elevationCells.find(
      (entry) => entry.x === cell.x && entry.y === cell.y,
    )?.level ?? 0
  );
}

function initialCell(definition: EnvironmentSceneDefinition): Cell {
  if (definition.id === "canyon-blizzard-frontier") return { x: 24, y: 10 };
  return { x: 8, y: 6 };
}

function BlizzardOverlay({ definition }: { readonly definition: EnvironmentSceneDefinition }) {
  const blizzard = definition.weatherRegions.find((region) => region.visualId === "weather.blizzard");
  if (!blizzard) return null;

  return (
    <div
      class="environment-weather environment-weather--blizzard"
      data-testid="environment-blizzard-overlay"
      data-weather-cell-count={blizzard.cells.length}
      style={{ "--blizzard-intensity": String(blizzard.intensity) }}
      aria-hidden="true"
    >
      {Array.from({ length: 34 }, (_, index) => (
        <i
          key={index}
          style={{
            "--flake-index": String(index),
            "--flake-x": `${(index * 29) % 100}%`,
            "--flake-y": `${(index * 17) % 100}%`,
            "--flake-delay": `${-(index % 11) * 0.13}s`,
          }}
        />
      ))}
    </div>
  );
}

function EnvironmentBattlefield({
  definition,
  selected,
  showGrid,
  showCoordinates,
  onSelect,
  controllerRef,
}: {
  readonly definition: EnvironmentSceneDefinition;
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
    const renderer = new MapReviewRenderer(
      host,
      initialOptionsRef.current,
      onSelect,
      definition.scene,
    );
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
  }, [controllerRef, definition, onSelect]);

  useEffect(() => rendererRef.current?.update(options), [options]);

  const weatherCellCount = definition.weatherRegions.reduce(
    (total, region) => total + region.cells.length,
    0,
  );

  return (
    <div class="map-review-battlefield-wrap environment-scene-battlefield">
      <div
        class="map-review-battlefield"
        ref={hostRef}
        data-testid="environment-scene-host"
        data-scene-id={definition.id}
        data-weather-cell-count={weatherCellCount}
      />
      <BlizzardOverlay definition={definition} />
      <div class="map-review-camera-note" aria-hidden="true">
        Drag to pan · wheel or controls to zoom · presentation rotation only
      </div>
    </div>
  );
}

export function EnvironmentScenesApp() {
  const [definition, setDefinition] = useState<EnvironmentSceneDefinition>(TWIN_ISLES_SHORE);
  const [selected, setSelected] = useState<Cell>(() => initialCell(TWIN_ISLES_SHORE));
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(
    () => window.innerWidth >= 1000 && window.innerHeight >= 600,
  );
  const cameraRef = useRef<MapReviewRenderer | undefined>(undefined);

  const elevation = elevationAt(definition, selected);
  const terrainVisualId = terrainVisualIdAt(definition, selected);
  const weatherVisualId = weatherVisualIdAt(definition, selected);

  function chooseScene(next: EnvironmentSceneDefinition): void {
    setDefinition(next);
    setSelected(initialCell(next));
  }

  return (
    <main class="map-review environment-scenes" aria-label="Fantasia environment scene review">
      <section class="map-review-stage environment-scenes-stage" aria-label={definition.title}>
        <EnvironmentBattlefield
          key={definition.id}
          definition={definition}
          selected={selected}
          showGrid={showGrid}
          showCoordinates={showCoordinates}
          onSelect={setSelected}
          controllerRef={cameraRef}
        />
      </section>

      <header class="map-review-topbar environment-scenes-topbar">
        <div class="map-review-title environment-scenes-title">
          <span class="map-review-kicker">{definition.kicker}</span>
          <h1>{definition.title}</h1>
          <span class="environment-scenes-description">{definition.description}</span>
        </div>

        <fieldset class="map-review-mode-switch environment-scene-switcher">
          <legend class="map-review-mode-legend">Environment scene</legend>
          {ENVIRONMENT_SCENES.map((candidate) => (
            <button
              type="button"
              class={candidate.id === definition.id ? "is-active" : ""}
              aria-pressed={candidate.id === definition.id}
              onClick={() => chooseScene(candidate)}
              key={candidate.id}
            >
              {candidate.title}
            </button>
          ))}
        </fieldset>

        <fieldset class="map-review-camera-controls">
          <legend class="map-review-mode-legend">Camera controls</legend>
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

        <button
          type="button"
          class="map-review-details-toggle"
          aria-expanded={detailsOpen}
          aria-controls="environment-scene-details"
          onClick={() => setDetailsOpen((open) => !open)}
        >
          {detailsOpen ? "Hide details" : "Details"}
        </button>
      </header>

      {detailsOpen ? (
        <aside
          id="environment-scene-details"
          class="map-review-details environment-scenes-details"
          aria-label="Environment scene details"
        >
          <section class="map-review-inspector" aria-live="polite">
            <p class="map-review-kicker">Selected cell</p>
            <h2 data-testid="environment-selected-coordinate">
              ({selected.x}, {selected.y})
            </h2>
            <p class="map-review-selected-label" data-testid="environment-selected-terrain">
              {terrainVisualId}
            </p>
            <ul>
              <li data-testid="environment-selected-elevation">Elevation {signed(elevation)}</li>
              <li>{weatherVisualId ?? "Clear weather"}</li>
              <li>{definition.scene.elevationCells.length} authored elevation cells</li>
            </ul>
          </section>

          <section class="map-review-layers" aria-label="Environment review layers">
            <h2>Review layers</h2>
            <label>
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(event) => setShowGrid(event.currentTarget.checked)}
              />
              Grid
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

          <section class="map-review-legend environment-scenes-legend" aria-label="Scene palette">
            <h2>Reusable presentation metadata</h2>
            {definition === CANYON_BLIZZARD_FRONTIER ? (
              <>
                <span>Sand · canyon · tundra · snow</span>
                <span>Localized weather.blizzard overlay</span>
              </>
            ) : (
              <>
                <span>Deep water · shallow water · shore</span>
                <span>Raised grass and ridge island interiors</span>
              </>
            )}
          </section>
        </aside>
      ) : null}
    </main>
  );
}
