import { CampaignSession } from "@fantasia/runtime";
import { useMemo } from "preact/hooks";
import "./saga.css";

interface SagaAppProps {
  readonly onHome: () => void;
  readonly onContinue: () => void;
  readonly onSettings: (trigger: HTMLElement) => void;
}

export function SagaApp({ onHome, onContinue, onSettings }: SagaAppProps) {
  const session = useMemo(() => new CampaignSession(), []);
  const view = session.view();
  const currentStage = view.stages.find((stage) => stage.current) ?? view.stages[0];

  return (
    <main class="campaign-screen saga-campaign-screen">
      <section class="campaign-shell overview-shell saga-reference-screen">
        <aside class="saga-reference-rail" aria-label="Saga chapters">
          <div class="saga-brand-row">
            <span class="saga-banner-mark" aria-hidden="true">
              ⚜
            </span>
            <div>
              <p class="hud-eyebrow">Saga {String(view.sagaSequence).padStart(2, "0")}</p>
              <h1>{view.sagaTitle}</h1>
              <p>{view.sagaSynopsis}</p>
            </div>
          </div>

          <div class="saga-chapter-list">
            {view.chapters.map((chapter) => {
              const current = chapter.current;
              return (
                <button
                  type="button"
                  class={`saga-chapter-row${current ? " is-current" : ""}`}
                  onClick={() => {
                    if (current) onContinue();
                  }}
                  disabled={!current}
                  aria-label={`${chapter.title}${current ? ", current chapter" : ", not implemented"}`}
                >
                  <span class="saga-chapter-number">{String(chapter.sequence).padStart(2, "0")}</span>
                  <span class="saga-chapter-copy">
                    <strong class="saga-chapter-title">{chapter.title}</strong>
                    <small class="saga-chapter-meta">
                      {current
                        ? "Current chapter"
                        : chapter.stageCount > 0
                          ? `${chapter.stageCount} stages available`
                          : "Production stages not implemented"}
                    </small>
                  </span>
                  <span class="saga-chapter-arrow" aria-hidden="true">
                    {current ? "›" : "—"}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section class="saga-main-field" aria-label="Saga overview">
          <header class="saga-field-header">
            <div>
              <p class="hud-eyebrow">Campaign archive</p>
              <h2>Saga overview</h2>
              <p>
                Review the visible chapter route and continue from the active campaign context.
                Unimplemented chapters remain unavailable rather than implying progression.
              </p>
            </div>
            <div class="saga-index" aria-label="Saga status">
              <span>Saga {String(view.sagaSequence).padStart(2, "0")}</span>
              <span>{view.chapters.length} chapters visible</span>
            </div>
          </header>

          <div class="saga-route-panel">
            <div class="saga-route-mark" aria-hidden="true">
              <div class="saga-route-emblem">
                <span class="emblem-glyph">⚜</span>
                <strong>The current route</strong>
                <small>One active chapter is exposed by the present production campaign state.</small>
              </div>
            </div>

            <article class="saga-current-card">
              <p class="hud-eyebrow">Current route</p>
              <h3>{view.selectedChapterTitle}</h3>
              <p>
                Continue from the selected Chapter I context. Chapter availability and stage state
                remain driven by the campaign model.
              </p>

              <div class="saga-current-meta" aria-label="Current chapter details">
                <span>
                  <small>Chapter</small>
                  <strong>{String(view.selectedChapterSequence).padStart(2, "0")}</strong>
                </span>
                <span>
                  <small>Current stage</small>
                  <strong>{currentStage?.title ?? "No stage exposed"}</strong>
                </span>
              </div>

              <button
                type="button"
                class="saga-next-objective"
                aria-label="Continue current chapter"
                onClick={onContinue}
              >
                <span>
                  <small class="saga-objective-label">Continue chapter</small>
                  <strong class="saga-objective-title">{view.selectedChapterTitle}</strong>
                </span>
                <span class="saga-objective-arrow" aria-hidden="true">
                  ›
                </span>
              </button>
            </article>
          </div>

          <nav class="saga-bottom-nav" aria-label="Saga navigation">
            <button type="button" onClick={onHome}>
              Home
            </button>
            <button type="button" onClick={onContinue}>
              Campaign
            </button>
            <button type="button" onClick={(event) => onSettings(event.currentTarget)}>
              Settings
            </button>
          </nav>
        </section>
      </section>
    </main>
  );
}
