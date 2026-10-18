import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { BattlefieldCellCoord } from "./battlefield-presentation.js";
import {
  ENVIRONMENT_SCENES,
  type EnvironmentSceneDefinition,
  GHOST_SEA_HUNT,
  terrainVisualIdAt,
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

interface PerformanceSample {
  readonly initMs: number;
  readonly redrawMs: number;
  readonly frameMedianMs: number;
  readonly frameP95Ms: number;
  readonly frameWorstMs: number;
  readonly frameSamples: number;
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
  return definition.focusCell;
}

function percentile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? 0;
}

function sampleAnimationFrames(sampleCount = 36): Promise<{
  readonly median: number;
  readonly p95: number;
  readonly worst: number;
  readonly samples: number;
}> {
  return new Promise((resolve) => {
    const intervals: number[] = [];
    let previous: number | undefined;

    const step = (now: number) => {
      if (previous !== undefined) intervals.push(now - previous);
      previous = now;
      if (intervals.length < sampleCount) {
        requestAnimationFrame(step);
        return;
      }
      const sorted = [...intervals].sort((left, right) => left - right);
      resolve({
        median: percentile(sorted, 0.5),
        p95: percentile(sorted, 0.95),
        worst: sorted.at(-1) ?? 0,
        samples: sorted.length,
      });
    };

    requestAnimationFrame(step);
  });
}

function EnvironmentWeather({ definition }: { readonly definition: EnvironmentSceneDefinition }) {
  const weather = definition.weatherRegions[0];
  if (!weather) return null;
  const variant = weather.visualId.replace("weather.", "");

  return (
    <div
      class={`environment-weather environment-weather--${variant}`}
      data-testid="environment-weather-overlay"
      data-weather-id={weather.visualId}
      data-weather-cell-count={weather.cells.length}
      style={{ "--weather-intensity": String(weather.intensity) }}
      aria-hidden="true"
    >
      {Array.from({ length: 30 }, (_, index) => (
        <i
          key={index}
          style={{
            "--particle-index": String(index),
            "--particle-x": `${(index * 29) % 100}%`,
            "--particle-y": `${(index * 17) % 100}%`,
            "--particle-delay": `${-(index % 11) * 0.17}s`,
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
  onPerformance,
  controllerRef,
}: {
  readonly definition: EnvironmentSceneDefinition;
  readonly selected: Cell;
  readonly showGrid: boolean;
  readonly showCoordinates: boolean;
  readonly onSelect: (cell: Cell) => void;
  readonly onPerformance: (sample: PerformanceSample) => void;
  readonly controllerRef: RendererRef;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MapReviewRenderer | undefined>(undefined);
  const options = useMemo<MapReviewRendererOptions>(
    () => ({
      selected,
      showGrid,
      showCoordinates,
      showRoute: false,
      showUnits: definition.showUnits,
    }),
    [definition.showUnits, selected, showGrid, showCoordinates],
  );
  const initialOptionsRef = useRef(options);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    host.dataset.performanceSampleStatus = "running";
    const renderer = new MapReviewRenderer(
      host,
      initialOptionsRef.current,
      onSelect,
      definition.scene,
    );
    rendererRef.current = renderer;
    controllerRef.current = renderer;
    const initStartedAt = performance.now();

    void renderer.init().then(async () => {
      if (disposed) {
        renderer.destroy();
        return;
      }
      const initMs = performance.now() - initStartedAt;
      const redrawStartedAt = performance.now();
      renderer.update(initialOptionsRef.current);
      const redrawMs = performance.now() - redrawStartedAt;
      const frames = await sampleAnimationFrames();
      if (disposed) return;

      const sample: PerformanceSample = {
        initMs,
        redrawMs,
        frameMedianMs: frames.median,
        frameP95Ms: frames.p95,
        frameWorstMs: frames.worst,
        frameSamples: frames.samples,
      };
      host.dataset.rendererInitMs = initMs.toFixed(2);
      host.dataset.rendererRedrawMs = redrawMs.toFixed(2);
      host.dataset.frameMedianMs = frames.median.toFixed(2);
      host.dataset.frameP95Ms = frames.p95.toFixed(2);
      host.dataset.frameWorstMs = frames.worst.toFixed(2);
      host.dataset.frameSampleCount = String(frames.samples);
      host.dataset.performanceSampleStatus = "complete";
      onPerformance(sample);
    });

    return () => {
      disposed = true;
      if (rendererRef.current === renderer) rendererRef.current = undefined;
      if (controllerRef.current === renderer) controllerRef.current = undefined;
      renderer.destroy();
    };
  }, [controllerRef, definition, onPerformance, onSelect]);

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
      <EnvironmentWeather definition={definition} />
      <div class="map-review-camera-note" aria-hidden="true">
        Drag to pan · wheel or controls to zoom · presentation rotation only
      </div>
    </div>
  );
}

export function EnvironmentScenesApp() {
  const [definition, setDefinition] = useState<EnvironmentSceneDefinition>(GHOST_SEA_HUNT);
  const [selected, setSelected] = useState<Cell>(() => initialCell(GHOST_SEA_HUNT));
  const [showCoordinates, setShowCoordinates] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [performanceSample, setPerformanceSample] = useState<PerformanceSample | undefined>();
  const [detailsOpen, setDetailsOpen] = useState(
    () => window.innerWidth >= 1000 && window.innerHeight >= 600,
  );
  const cameraRef = useRef<MapReviewRenderer | undefined>(undefined);

  const elevation = elevationAt(definition, selected);
  const terrainVisualId = terrainVisualIdAt(definition, selected);
  const weatherVisualId = weatherVisualIdAt(definition, selected);
  const cellCount =
    (definition.scene.bounds.maxX - definition.scene.bounds.minX + 1) *
    (definition.scene.bounds.maxY - definition.scene.bounds.minY + 1);

  function chooseScene(next: EnvironmentSceneDefinition): void {
    setPerformanceSample(undefined);
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
          onPerformance={setPerformanceSample}
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
              <li>{cellCount} rendered cells</li>
            </ul>
          </section>

          <section class="map-review-inspector environment-performance" aria-label="Large scene performance probe">
            <p class="map-review-kicker">Developer performance probe</p>
            {performanceSample ? (
              <ul data-testid="environment-performance-result">
                <li>Renderer init {performanceSample.initMs.toFixed(2)} ms</li>
                <li>Full redraw {performanceSample.redrawMs.toFixed(2)} ms</li>
                <li>Frame median {performanceSample.frameMedianMs.toFixed(2)} ms</li>
                <li>Frame p95 {performanceSample.frameP95Ms.toFixed(2)} ms</li>
                <li>Frame worst {performanceSample.frameWorstMs.toFixed(2)} ms</li>
                <li>{performanceSample.frameSamples} sampled frame intervals</li>
              </ul>
            ) : (
              <p data-testid="environment-performance-pending">Sampling…</p>
            )}
            <small>Observational only; no production frame-time budget is frozen.</small>
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
            {definition.paletteNotes.map((note) => (
              <span key={note}>{note}</span>
            ))}
          </section>
        </aside>
      ) : null}
    </main>
  );
}
