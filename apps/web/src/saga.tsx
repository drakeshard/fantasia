import { CampaignSession } from "@fantasia/runtime";
import { useMemo } from "preact/hooks";

const UI_ASSET_ROOT = "/assets/ui/core";

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
      <section class="campaign-shell saga-reference-screen saga-war-table">
        <header class="saga-top-hud">
          <button type="button" class="saga-utility-button" onClick={onHome} aria-label="Home">
            <img
              src={`${UI_ASSET_ROOT}/fantasia_ui_icon_home_default_v001.svg`}
              alt=""
              aria-hidden="true"
            />
            <span>Home</span>
          </button>

          <div class="saga-title-lockup">
            <span class="saga-title-crest" aria-hidden="true">
              <img src={`${UI_ASSET_ROOT}/fantasia_ui_brand_crest_v001.svg`} alt="" />
            </span>
            <div>
              <p class="saga-kicker">Saga {String(view.sagaSequence).padStart(2, "0")}</p>
              <h1>{view.sagaTitle}</h1>
            </div>
          </div>

          <button
            type="button"
            class="saga-utility-button"
            onClick={(event) => onSettings(event.currentTarget)}
            aria-label="Settings"
          >
            <img
              src={`${UI_ASSET_ROOT}/fantasia_ui_icon_settings_default_v001.svg`}
              alt=""
              aria-hidden="true"
            />
            <span>Settings</span>
          </button>
        </header>

        <div class="saga-war-table-body">
          <section class="saga-identity-panel" aria-labelledby="saga-story-heading">
            <div class="saga-identity-emblem" aria-hidden="true">
              <img
                class="saga-identity-ring"
                src={`${UI_ASSET_ROOT}/fantasia_ui_ornament_crest_ring_v001.svg`}
                alt=""
              />
              <img
                class="saga-identity-crest"
                src={`${UI_ASSET_ROOT}/fantasia_ui_brand_crest_v001.svg`}
                alt=""
              />
            </div>
            <div class="saga-identity-copy">
              <p class="saga-kicker">Current campaign</p>
              <h2 id="saga-story-heading">{view.sagaTitle}</h2>
              <p>{view.sagaSynopsis}</p>
            </div>
          </section>

          <section class="saga-chapter-route" aria-labelledby="saga-route-heading">
            <div class="saga-route-heading">
              <div>
                <p class="saga-kicker">Chapter path</p>
                <h2 id="saga-route-heading">Your current journey</h2>
              </div>
              <p>Known chapters only. Route styling is progression presentation, not geography.</p>
            </div>

            <div class="saga-route-track" role="list" aria-label="Saga chapters">
              {view.chapters.map((chapter, index) => {
                const current = chapter.current;
                return (
                  <div
                    class={`saga-route-step${current ? " is-current" : " is-unavailable"}`}
                    role="listitem"
                    key={chapter.id}
                  >
                    {index > 0 ? <span class="saga-route-connector" aria-hidden="true" /> : null}
                    <button
                      type="button"
                      class="saga-chapter-node"
                      onClick={() => {
                        if (current) onContinue();
                      }}
                      disabled={!current}
                      aria-label={`${chapter.title}${current ? ", current chapter" : ", not implemented"}`}
                    >
                      <span class="saga-node-medallion" aria-hidden="true">
                        {current ? (
                          <img
                            src={`${UI_ASSET_ROOT}/fantasia_ui_icon_campaign_default_v001.svg`}
                            alt=""
                          />
                        ) : (
                          <img src={`${UI_ASSET_ROOT}/fantasia_ui_icon_lock_v001.svg`} alt="" />
                        )}
                      </span>
                      <span class="saga-node-copy">
                        <small>Chapter {String(chapter.sequence).padStart(2, "0")}</small>
                        <strong>{chapter.title}</strong>
                        <span>
                          {current
                            ? "Current chapter"
                            : chapter.stageCount > 0
                              ? `${chapter.stageCount} stages available`
                              : "Production stages not implemented"}
                        </span>
                      </span>
                      <span class="saga-node-action" aria-hidden="true">
                        {current ? (
                          <img
                            src={`${UI_ASSET_ROOT}/fantasia_ui_icon_chevron_right_v001.svg`}
                            alt=""
                          />
                        ) : (
                          <span>Unavailable</span>
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <aside class="saga-current-mission" aria-label="Current chapter">
            <div class="saga-current-heading">
              <span class="saga-current-icon" aria-hidden="true">
                <img
                  src={`${UI_ASSET_ROOT}/fantasia_ui_icon_campaign_default_v001.svg`}
                  alt=""
                />
              </span>
              <div>
                <p class="saga-kicker">Current chapter</p>
                <h2>{view.selectedChapterTitle}</h2>
              </div>
            </div>

            <div class="saga-current-stage">
              <small>Current stage</small>
              <strong>{currentStage?.title ?? "No stage exposed"}</strong>
            </div>

            <p class="saga-current-note">
              Continue into the existing Chapter {String(view.selectedChapterSequence).padStart(2, "0")} context. Stage access and progression remain campaign-owned.
            </p>

            <button
              type="button"
              class="saga-continue-button"
              aria-label={`Continue ${view.selectedChapterTitle}`}
              onClick={onContinue}
            >
              <span>
                <small>Continue chapter</small>
                <strong>{view.selectedChapterTitle}</strong>
              </span>
              <img
                src={`${UI_ASSET_ROOT}/fantasia_ui_icon_chevron_right_v001.svg`}
                alt=""
                aria-hidden="true"
              />
            </button>
          </aside>
        </div>

        <footer class="saga-footer-status">
          <span>Fantasia / Saga {String(view.sagaSequence).padStart(2, "0")}</span>
          <span>{view.chapters.length} known chapters in the production campaign view</span>
        </footer>
      </section>
    </main>
  );
}
