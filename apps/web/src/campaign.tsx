import { CampaignSession, type CampaignStageView, type CampaignView } from "@fantasia/runtime";
import { useMemo, useState } from "preact/hooks";
import "./campaign.css";

type CampaignScreen = "overview" | "chapter";

const stageAnchors = [
  { left: 14, top: 70 },
  { left: 29, top: 57 },
  { left: 43, top: 64 },
  { left: 57, top: 45 },
  { left: 72, top: 51 },
  { left: 85, top: 32 },
] as const;

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
      <button type="button" class="ui-button primary campaign-enter" onClick={onEnter}>
        {stage.kind === "battle" ? "Enter battle" : "View story"}
      </button>
    </aside>
  );
}

export function CampaignApp({ onOpenBattle }: { readonly onOpenBattle: () => void }) {
  const session = useMemo(() => new CampaignSession(), []);
  const [view, setView] = useState<CampaignView>(() => session.view());
  const [screen, setScreen] = useState<CampaignScreen>("chapter");
  const [message, setMessage] = useState("Select a stage to inspect it before entry.");
  const [stageListOpen, setStageListOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const selectedStage = view.stages.find((stage) => stage.id === view.selectedStageId);

  function selectChapter(chapterId: string) {
    const next = session.selectChapter(chapterId);
    if (!next) return;
    setView(next);
    setScreen("chapter");
    setMessage(
      next.stages.length > 0
        ? `${next.selectedChapterTitle} opened. Select a stage to inspect it.`
        : `${next.selectedChapterTitle} is known, but production stage content is not implemented yet.`,
    );
  }

  function selectStage(stageId: string) {
    const next = session.selectStage(stageId);
    if (!next) return;
    setView(next);
    const stage = next.stages.find((candidate) => candidate.id === next.selectedStageId);
    setMessage(stage ? `${stage.title} selected for inspection.` : "Stage selected.");
  }

  function continueCurrent() {
    const next = session.continueCurrent();
    setView(next);
    setScreen("chapter");
    setMessage(`Continue restored ${next.selectedChapterTitle} and its current stage.`);
  }

  function enterSelected() {
    const result = session.enterSelectedStage();
    setView(result.view);
    setMessage(
      result.kind === "rejected"
        ? result.reason
        : `Stage entry accepted for ${result.destination}.`,
    );
  }

  function fitMap() {
    setZoom(1);
    setMessage("Map fitted to the available campaign area.");
  }

  if (screen === "overview") {
    return (
      <main class="campaign-screen">
        <section class="campaign-shell overview-shell">
          <header class="campaign-header">
            <button type="button" class="nav-button" disabled>
              Back
            </button>
            <div class="campaign-title-block">
              <span>FANTASIA / CAMPAIGN</span>
              <h1>{view.sagaTitle}</h1>
            </div>
            <div class="campaign-header-actions">
              <button type="button" class="nav-button" onClick={continueCurrent}>
                Home
              </button>
              <details class="settings-menu">
                <summary>Settings</summary>
                <div class="settings-sheet">
                  <strong>Interface preferences</strong>
                  <p>System reduced-motion preference is respected.</p>
                  <p>Additional game preferences are not implemented in this slice.</p>
                </div>
              </details>
            </div>
          </header>

          <section class="saga-overview-card">
            <p class="hud-eyebrow">Saga {String(view.sagaSequence).padStart(2, "0")}</p>
            <h2>{view.sagaTitle}</h2>
            <p>{view.sagaSynopsis}</p>
            <button
              type="button"
              class="ui-button primary continue-button"
              onClick={continueCurrent}
            >
              Continue chapter
            </button>
            <span>Resume your current journey</span>
          </section>

          <section class="chapter-selection" aria-label="Chapters">
            <div class="section-heading">
              <div>
                <p class="hud-eyebrow">Chapters</p>
                <h2>Choose a chapter</h2>
              </div>
              <button type="button" class="ui-button secondary" onClick={onOpenBattle}>
                Development battle sandbox
              </button>
            </div>
            <div class="chapter-grid">
              {view.chapters.map((chapter) => (
                <button
                  type="button"
                  class={`chapter-card${chapter.current ? " is-current" : ""}`}
                  onClick={() => selectChapter(chapter.id)}
                >
                  <span>Chapter {String(chapter.sequence).padStart(2, "0")}</span>
                  <strong>{chapter.title}</strong>
                  <small>
                    {chapter.current
                      ? "Current chapter"
                      : chapter.stageCount > 0
                        ? `${chapter.stageCount} stages available`
                        : "Production stages not implemented"}
                  </small>
                </button>
              ))}
            </div>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main class="campaign-screen">
      <section class="campaign-shell">
        <header class="campaign-header">
          <button type="button" class="nav-button" onClick={() => setScreen("overview")}>
            Back
          </button>
          <div class="campaign-title-block">
            <span>
              {view.sagaTitle.toUpperCase()} / CHAPTER{" "}
              {String(view.selectedChapterSequence).padStart(2, "0")}
            </span>
            <h1>{view.selectedChapterTitle}</h1>
          </div>
          <div class="campaign-header-actions">
            <button type="button" class="nav-button" onClick={() => setScreen("overview")}>
              Home
            </button>
            <details class="settings-menu">
              <summary>Settings</summary>
              <div class="settings-sheet">
                <strong>Interface preferences</strong>
                <p>System reduced-motion preference is respected.</p>
                <p>Additional game preferences are not implemented in this slice.</p>
              </div>
            </details>
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
                <button
                  type="button"
                  aria-label="Zoom out"
                  onClick={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))}
                  disabled={zoom <= 1}
                >
                  −
                </button>
                <button
                  type="button"
                  aria-label="Zoom in"
                  onClick={() =>
                    setZoom((value) => Math.min(2.5, Number((value + 0.25).toFixed(2))))
                  }
                  disabled={zoom >= 2.5}
                >
                  +
                </button>
                <button type="button" onClick={fitMap}>
                  Fit
                </button>
                <button type="button" onClick={() => setStageListOpen((value) => !value)}>
                  {stageListOpen ? "Hide stage list" : "Stage list"}
                </button>
              </div>
            </div>

            <div class="campaign-map-viewport">
              <div class="campaign-map-art" style={{ transform: `scale(${zoom})` }}>
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

        <button type="button" class="sandbox-launch" onClick={onOpenBattle}>
          Open development battle sandbox
        </button>
      </section>
    </main>
  );
}
