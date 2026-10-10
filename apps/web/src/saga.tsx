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
                  <span class="saga-chapter-number">Ch.{chapter.sequence}</span>
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

        <section class="saga-season-badge" aria-label="Saga timeframe">
          <span class="saga-season-icon" aria-hidden="true">
            ☀
          </span>
          <div>
            <strong class="saga-season-name">Spring</strong>
            <small class="saga-season-year">Year 1429</small>
          </div>
        </section>

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

        <button type="button" class="saga-next-objective" onClick={onContinue}>
          <span>
            <small class="saga-objective-label">Next objective</small>
            <strong class="saga-objective-title">{view.selectedChapterTitle}</strong>
          </span>
          <span class="saga-objective-arrow" aria-hidden="true">
            ›
          </span>
        </button>
      </section>
    </main>
  );
}
