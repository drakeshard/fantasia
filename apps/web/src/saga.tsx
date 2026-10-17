import { CampaignSession } from "@fantasia/runtime";
import { useMemo } from "preact/hooks";
import { GameUtilityCluster } from "./game-controls.js";
import { UiButton, UiPanel } from "./ui/primitives.js";

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
          <div class="saga-navigation-start" aria-hidden="true" />

          <div class="saga-title-lockup">
            <span class="saga-title-crest" aria-hidden="true">
              <img src={`${UI_ASSET_ROOT}/fantasia_ui_brand_crest_v001.svg`} alt="" />
            </span>
            <div>
              <p class="saga-kicker">Saga {String(view.sagaSequence).padStart(2, "0")}</p>
              <h1>{view.sagaTitle}</h1>
            </div>
          </div>

          <GameUtilityCluster
            onHome={onHome}
            onSettings={onSettings}
            class="saga-global-utilities"
          />
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

          <UiPanel class="saga-chapter-route" tone="overlay" ariaLabel="Chapter path">
            <div class="saga-route-heading">
              <div>
                <p class="saga-kicker">Chapter path</p>
                <h2 id="saga-route-heading">Your current journey</h2>
              </div>
              <p>Known chapters only. Route styling is progression presentation, not geography.</p>
            </div>

            <ol class="saga-route-track" aria-label="Saga chapters">
              {view.chapters.map((chapter, index) => {
                const current = chapter.current;
                return (
                  <li
                    class={`saga-route-step${current ? " is-current" : " is-unavailable"}`}
                    key={chapter.id}
                  >
                    {index > 0 ? <span class="saga-route-connector" aria-hidden="true" /> : null}
                    <UiButton
                      class="saga-chapter-node"
                      tone="quiet"
                      selected={current}
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
                    </UiButton>
                  </li>
                );
              })}
            </ol>
          </UiPanel>

          <UiPanel class="saga-current-mission" tone="raised" ariaLabel="Current chapter">
            <div class="saga-current-heading">
              <span class="saga-current-icon" aria-hidden="true">
                <img src={`${UI_ASSET_ROOT}/fantasia_ui_icon_campaign_default_v001.svg`} alt="" />
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
              Continue into the existing Chapter{" "}
              {String(view.selectedChapterSequence).padStart(2, "0")} context. Stage access and
              progression remain campaign-owned.
            </p>

            <UiButton
              class="saga-continue-button"
              tone="primary"
              aria-label="Continue current chapter"
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
            </UiButton>
          </UiPanel>
        </div>

        <footer class="saga-footer-status">
          <span>Fantasia / Saga {String(view.sagaSequence).padStart(2, "0")}</span>
          <span>{view.chapters.length} known chapters in the production campaign view</span>
        </footer>
      </section>
    </main>
  );
}
