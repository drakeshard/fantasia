import { CampaignSession, type CampaignStageView, type CampaignView } from "@fantasia/runtime";
import { useMemo, useRef, useState } from "preact/hooks";
import { GameButton } from "./game-controls.js";
import "./campaign.css";
import "./campaign-camera.css";

type CameraSnapshot = Readonly<{
  zoom: number;
  left: number;
  top: number;
}>;

type PointerPoint = Readonly<{ x: number; y: number }>;

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  startLeft: number;
  startTop: number;
  moved: boolean;
};

type PinchState = Readonly<{
  distance: number;
  zoom: number;
  left: number;
  top: number;
  focalX: number;
  focalY: number;
}>;

const MIN_MAP_ZOOM = 1;
const MAX_MAP_ZOOM = 2.5;
const MAP_ZOOM_STEP = 0.25;
const MAP_WHEEL_STEP = 0.1;
const DRAG_THRESHOLD = 7;

const stageAnchors = [
  { left: 14, top: 70 },
  { left: 29, top: 57 },
  { left: 43, top: 64 },
  { left: 57, top: 45 },
  { left: 72, top: 51 },
  { left: 85, top: 32 },
] as const;

function clampZoom(value: number): number {
  return Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, Number(value.toFixed(2))));
}

function pointerDistance(first: PointerPoint, second: PointerPoint): number {
  return Math.hypot(second.x - first.x, second.y - first.y);
}

function pointerMidpoint(first: PointerPoint, second: PointerPoint): PointerPoint {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function stageKindLabel(stage: CampaignStageView): string {
  return stage.kind === "battle" ? "Battle" : "Story";
}

function stageStateLabel(stage: CampaignStageView): string {
  if (stage.access.kind === "locked") return "Locked";
  if (stage.completion === "cleared") return "Cleared";
  if (stage.current) return "Current";
  return "Available";
}

function StageInspector({
  stage,
  onEnter,
}: {
  readonly stage: CampaignStageView | undefined;
  readonly onEnter: () => void;
}) {
  if (stage === undefined) {
    return (
      <aside class="campaign-inspector empty" aria-label="Stage details">
        <p class="hud-eyebrow">Stage details</p>
        <h2>No stage selected</h2>
        <p>This chapter does not yet expose production stage content.</p>
      </aside>
    );
  }

  const unavailableReason =
    stage.access.kind === "locked"
      ? stage.access.reason
      : stage.entry.kind === "unavailable"
        ? stage.entry.reason
        : undefined;

  return (
    <aside class="campaign-inspector" aria-label="Stage details">
      <div class="inspector-scroll">
        <p class="hud-eyebrow">
          {stageKindLabel(stage)} / {stageStateLabel(stage)}
        </p>
        <h2>{stage.title}</h2>
        {stage.synopsis ? <p>{stage.synopsis}</p> : null}
        {stage.objective ? (
          <section class="inspector-section">
            <h3>Objective</h3>
            <p>{stage.objective}</p>
          </section>
        ) : null}
        {stage.condition ? (
          <section class="inspector-section">
            <h3>Party condition</h3>
            <p>{stage.condition}</p>
          </section>
        ) : null}
        {unavailableReason ? <p class="entry-reason">{unavailableReason}</p> : null}
      </div>
      <GameButton
        tone="primary"
        icon={stage.kind === "battle" ? "campaign" : "forward"}
        class="campaign-enter"
        onClick={onEnter}
      >
        {stage.kind === "battle" ? "Enter battle" : "View story"}
      </GameButton>
    </aside>
  );
}

export function CampaignApp({ onEnterStory }: { readonly onEnterStory: (nodeId: string) => void }) {
  const session = useMemo(() => new CampaignSession(), []);
  const [view, setView] = useState<CampaignView>(() => session.view());
  const [message, setMessage] = useState("Select a stage to inspect it before entry.");
  const [stageListOpen, setStageListOpen] = useState(true);
  const [zoom, setZoom] = useState(MIN_MAP_ZOOM);
  const [panning, setPanning] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<CameraSnapshot>({ zoom: MIN_MAP_ZOOM, left: 0, top: 0 });
  const camerasByChapter = useRef(new Map<string, CameraSnapshot>());
  const pointers = useRef(new Map<number, PointerPoint>());
  const dragState = useRef<DragState>();
  const pinchState = useRef<PinchState>();
  const suppressClick = useRef(false);
  const selectedStage = view.stages.find((stage) => stage.id === view.selectedStageId);

  function zoomAt(nextZoom: number, focalX?: number, focalY?: number) {
    const targetZoom = clampZoom(nextZoom);
    if (targetZoom === zoom) return;
    const viewport = viewportRef.current;
    if (!viewport) {
      setZoom(targetZoom);
      cameraRef.current = { ...cameraRef.current, zoom: targetZoom };
      return;
    }

    const pointX = focalX ?? viewport.clientWidth / 2;
    const pointY = focalY ?? viewport.clientHeight / 2;
    const contentX = (viewport.scrollLeft + pointX) / zoom;
    const contentY = (viewport.scrollTop + pointY) / zoom;
    const nextLeft = Math.max(0, contentX * targetZoom - pointX);
    const nextTop = Math.max(0, contentY * targetZoom - pointY);
    const snapshot = { zoom: targetZoom, left: nextLeft, top: nextTop };
    cameraRef.current = snapshot;
    camerasByChapter.current.set(view.selectedChapterId, snapshot);
    setZoom(targetZoom);
    requestAnimationFrame(() => {
      const current = viewportRef.current;
      if (!current) return;
      current.scrollLeft = nextLeft;
      current.scrollTop = nextTop;
    });
  }

  function selectStage(stageId: string) {
    const next = session.selectStage(stageId);
    if (!next) return;
    setView(next);
    const stage = next.stages.find((candidate) => candidate.id === next.selectedStageId);
    setMessage(stage ? `${stage.title} selected for inspection.` : "Stage selected.");
  }

  function enterSelected() {
    const result = session.enterSelectedStage();
    setView(result.view);
    if (result.kind === "rejected") {
      setMessage(result.reason);
      return;
    }
    if (selectedStage?.kind !== "story") {
      setMessage("This stage has no production execution route yet.");
      return;
    }
    setMessage(`Opening ${selectedStage.title}.`);
    onEnterStory(result.destination);
  }

  function fitMap() {
    const snapshot = { zoom: MIN_MAP_ZOOM, left: 0, top: 0 };
    cameraRef.current = snapshot;
    camerasByChapter.current.set(view.selectedChapterId, snapshot);
    setZoom(MIN_MAP_ZOOM);
    requestAnimationFrame(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.scrollLeft = 0;
      viewport.scrollTop = 0;
    });
    setMessage("Map fitted to the available campaign area.");
  }

  function beginPointer(event: PointerEvent) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (pointers.current.size === 0) suppressClick.current = false;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size === 1) {
      dragState.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startLeft: viewport.scrollLeft,
        startTop: viewport.scrollTop,
        moved: false,
      };
      pinchState.current = undefined;
      return;
    }

    if (pointers.current.size === 2) {
      const [first, second] = [...pointers.current.values()];
      if (!first || !second) return;
      const rect = viewport.getBoundingClientRect();
      const midpoint = pointerMidpoint(first, second);
      pinchState.current = {
        distance: Math.max(1, pointerDistance(first, second)),
        zoom,
        left: viewport.scrollLeft,
        top: viewport.scrollTop,
        focalX: midpoint.x - rect.left,
        focalY: midpoint.y - rect.top,
      };
      dragState.current = undefined;
      setPanning(true);
    }
  }

  function movePointer(event: PointerEvent) {
    const viewport = viewportRef.current;
    if (!viewport || !pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2 && pinchState.current) {
      const [first, second] = [...pointers.current.values()];
      if (!first || !second) return;
      event.preventDefault();
      const pinch = pinchState.current;
      const distance = Math.max(1, pointerDistance(first, second));
      const targetZoom = clampZoom(pinch.zoom * (distance / pinch.distance));
      const contentX = (pinch.left + pinch.focalX) / pinch.zoom;
      const contentY = (pinch.top + pinch.focalY) / pinch.zoom;
      const nextLeft = Math.max(0, contentX * targetZoom - pinch.focalX);
      const nextTop = Math.max(0, contentY * targetZoom - pinch.focalY);
      const snapshot = { zoom: targetZoom, left: nextLeft, top: nextTop };
      cameraRef.current = snapshot;
      camerasByChapter.current.set(view.selectedChapterId, snapshot);
      setZoom(targetZoom);
      requestAnimationFrame(() => {
        const current = viewportRef.current;
        if (!current) return;
        current.scrollLeft = nextLeft;
        current.scrollTop = nextTop;
      });
      return;
    }

    const drag = dragState.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) return;
    event.preventDefault();
    if (!drag.moved) {
      try {
        viewport.setPointerCapture(event.pointerId);
      } catch {
        // Synthetic/browser-specific pointer capture failure does not invalidate map input.
      }
    }
    drag.moved = true;
    setPanning(true);
    viewport.scrollLeft = drag.startLeft - deltaX;
    viewport.scrollTop = drag.startTop - deltaY;
    cameraRef.current = { zoom, left: viewport.scrollLeft, top: viewport.scrollTop };
  }

  function endPointer(event: PointerEvent) {
    const viewport = viewportRef.current;
    const drag = dragState.current;
    if (drag?.pointerId === event.pointerId && drag.moved) {
      suppressClick.current = true;
    }
    pointers.current.delete(event.pointerId);
    if (viewport) {
      cameraRef.current = { zoom, left: viewport.scrollLeft, top: viewport.scrollTop };
      camerasByChapter.current.set(view.selectedChapterId, cameraRef.current);
      try {
        viewport.releasePointerCapture(event.pointerId);
      } catch {
        // Pointer capture may already be released by the browser.
      }
    }
    if (pointers.current.size < 2) pinchState.current = undefined;
    if (pointers.current.size === 0) {
      dragState.current = undefined;
      setPanning(false);
    }
  }

  return (
    <main class="campaign-screen">
      <section class="campaign-shell">
        <header class="campaign-header">
          <div class="campaign-title-block">
            <span>
              {view.sagaTitle.toUpperCase()} / CHAPTER{" "}
              {String(view.selectedChapterSequence).padStart(2, "0")}
            </span>
            <h1>{view.selectedChapterTitle}</h1>
          </div>
        </header>

        <div class="campaign-body">
          <section class="campaign-map-panel" aria-label="Chapter map">
            <div class="campaign-map-heading">
              <div>
                <p class="hud-eyebrow">Loire approaches</p>
                <p>{view.stages.length} permitted stages</p>
              </div>
              <div class="map-toolbar" role="toolbar" aria-label="Map controls">
                <GameButton
                  tone="utility"
                  aria-label="Zoom out"
                  onClick={() => zoomAt(zoom - MAP_ZOOM_STEP)}
                  disabled={zoom <= MIN_MAP_ZOOM}
                >
                  −
                </GameButton>
                <GameButton
                  tone="utility"
                  aria-label="Zoom in"
                  onClick={() => zoomAt(zoom + MAP_ZOOM_STEP)}
                  disabled={zoom >= MAX_MAP_ZOOM}
                >
                  +
                </GameButton>
                <GameButton tone="utility" onClick={fitMap}>
                  Fit
                </GameButton>
                <GameButton tone="utility" onClick={() => setStageListOpen((value) => !value)}>
                  {stageListOpen ? "Hide stages" : "Stages"}
                </GameButton>
              </div>
            </div>

            <div
              ref={viewportRef}
              class={`campaign-map-viewport${panning ? " is-panning" : ""}`}
              data-testid="campaign-map-viewport"
              onScroll={(event) => {
                const target = event.currentTarget;
                const snapshot = { zoom, left: target.scrollLeft, top: target.scrollTop };
                cameraRef.current = snapshot;
                camerasByChapter.current.set(view.selectedChapterId, snapshot);
              }}
              onWheel={(event) => {
                event.preventDefault();
                const rect = event.currentTarget.getBoundingClientRect();
                zoomAt(
                  zoom + (event.deltaY < 0 ? MAP_WHEEL_STEP : -MAP_WHEEL_STEP),
                  event.clientX - rect.left,
                  event.clientY - rect.top,
                );
              }}
              onPointerDown={(event) => beginPointer(event)}
              onPointerMove={(event) => movePointer(event)}
              onPointerUp={(event) => endPointer(event)}
              onPointerCancel={(event) => endPointer(event)}
              onClickCapture={(event) => {
                if (!suppressClick.current) return;
                event.preventDefault();
                event.stopPropagation();
                suppressClick.current = false;
              }}
            >
              <div
                class="campaign-map-art"
                data-testid="campaign-map-art"
                style={{
                  width: `${zoom * 100}%`,
                  minWidth: `${760 * zoom}px`,
                  height: `${zoom * 100}%`,
                  minHeight: `${520 * zoom}px`,
                }}
              >
                <span class="map-river river-one" aria-hidden="true" />
                <span class="map-river river-two" aria-hidden="true" />
                <span class="map-landmark landmark-one" aria-hidden="true">
                  ✦
                </span>
                <span class="map-landmark landmark-two" aria-hidden="true">
                  ♜
                </span>
                <svg
                  class="campaign-routes"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {view.stages.slice(1).map((_stage, index) => {
                    const from = stageAnchors[index];
                    const to = stageAnchors[index + 1];
                    if (!from || !to) return null;
                    return (
                      <line
                        x1={from.left}
                        y1={from.top}
                        x2={to.left}
                        y2={to.top}
                        class="campaign-route"
                      />
                    );
                  })}
                </svg>
                {view.stages.map((stage, index) => {
                  const anchor = stageAnchors[index] ?? { left: 50, top: 50 };
                  return (
                    <button
                      type="button"
                      class={`campaign-node ${stage.kind}${stage.selected ? " is-selected" : ""}${stage.current ? " is-current" : ""}${stage.completion === "cleared" ? " is-complete" : ""}`}
                      style={{ left: `${anchor.left}%`, top: `${anchor.top}%` }}
                      onClick={() => selectStage(stage.id)}
                      aria-pressed={stage.selected}
                      aria-label={`${stage.title}, ${stageKindLabel(stage)}, ${stageStateLabel(stage)}`}
                    >
                      <span class="node-glyph" aria-hidden="true">
                        {stage.kind === "battle" ? "⚔" : "▤"}
                      </span>
                      <span class="node-label">{stage.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div class="campaign-map-footer" aria-live="polite">
              <span>{message}</span>
              <span>Zoom {zoom.toFixed(2)}×</span>
            </div>
          </section>

          {stageListOpen ? (
            <aside class="stage-list" aria-label="Stage list">
              <div class="stage-list-heading">
                <p class="hud-eyebrow">Stage list</p>
                <strong>{view.selectedChapterTitle}</strong>
              </div>
              <div class="stage-list-items">
                {view.stages.map((stage) => (
                  <button
                    type="button"
                    class={`stage-list-entry${stage.selected ? " is-selected" : ""}`}
                    onClick={() => selectStage(stage.id)}
                    aria-pressed={stage.selected}
                  >
                    <span>{String(stage.sequence).padStart(2, "0")}</span>
                    <span>
                      <strong>{stage.title}</strong>
                      <small>
                        {stageKindLabel(stage)} · {stageStateLabel(stage)}
                      </small>
                    </span>
                  </button>
                ))}
              </div>
            </aside>
          ) : null}

          <StageInspector stage={selectedStage} onEnter={enterSelected} />
        </div>
      </section>
    </main>
  );
}
