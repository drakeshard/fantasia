import { CampaignSession } from "@fantasia/runtime";
import { useMemo } from "preact/hooks";

interface HomeAppProps {
  readonly onContinue: () => void;
  readonly onCampaign: () => void;
  readonly onSettings: (trigger: HTMLElement) => void;
}

function UiIcon({ name, className = "" }: { readonly name: string; readonly className?: string }) {
  return <span class={`fantasia-ui-icon fantasia-ui-icon-${name} ${className}`.trim()} aria-hidden="true" />;
}

export function HomeApp({ onContinue, onCampaign, onSettings }: HomeAppProps) {
  const session = useMemo(() => new CampaignSession(), []);
  const view = session.view();
  const currentStage = view.stages.find((stage) => stage.current) ?? view.stages[0];

  return (
    <main class="home-screen home-lobby" aria-label="Fantasia home">
      <header class="home-lobby-hud">
        <div class="home-wordmark">
          <span class="home-wordmark-mark" aria-hidden="true">
            <UiIcon name="brand" />
          </span>
          <span class="home-wordmark-copy">
            <strong>FANTASIA</strong>
            <small>Chronicles beyond the fracture</small>
          </span>
        </div>
        <div class="home-lobby-status">
          <span class="home-status-dot" aria-hidden="true" />
          <span>Story campaign</span>
        </div>
      </header>

      <div class="home-lobby-field">
        <section class="home-lobby-stage" aria-label="Current journey">
          <div class="home-stage-label">
            <span>Current journey</span>
            <strong>{view.sagaTitle}</strong>
          </div>

          <section class="home-current-story" aria-label="Continue current story">
            <div class="home-current-story-mark" aria-hidden="true">
              <UiIcon name="campaign" />
              <span>{view.sagaSequence}</span>
            </div>
            <div class="home-current-story-copy">
              <span class="home-current-story-kicker">
                Saga {String(view.sagaSequence).padStart(2, "0")}
              </span>
              <h1>{view.sagaTitle}</h1>
              <p>
                Chapter {String(view.selectedChapterSequence).padStart(2, "0")} ·{" "}
                {view.selectedChapterTitle}
              </p>
              {currentStage ? <small>Current stage · {currentStage.title}</small> : null}
            </div>
            <button
              type="button"
              class="home-current-story-continue"
              aria-label="Continue current story"
              onClick={onContinue}
            >
              <span>Continue</span>
              <UiIcon name="chevron" />
            </button>
          </section>
        </section>

        <aside class="home-feature-rail" aria-label="Home highlights">
          <section class="home-feature-card home-feature-current">
            <span class="home-feature-kicker">Current Saga</span>
            <div class="home-feature-emblem" aria-hidden="true">
              <UiIcon name="campaign" />
            </div>
            <div class="home-feature-copy">
              <h2>{view.sagaTitle}</h2>
              <p>{view.selectedChapterTitle}</p>
              {currentStage ? <small>{currentStage.title}</small> : null}
            </div>
            <div class="home-feature-rule" aria-hidden="true" />
            <div class="home-feature-footer">
              <span class="home-feature-sequence">Saga {String(view.sagaSequence).padStart(2, "0")}</span>
              <span class="home-feature-state">Campaign ready</span>
            </div>
          </section>

          <section class="home-feature-card home-feature-locked" aria-label="Summon unavailable">
            <div class="home-feature-emblem summon" aria-hidden="true">
              <UiIcon name="summon" />
            </div>
            <div class="home-feature-copy">
              <span class="home-feature-kicker">Future system</span>
              <h2>Summon</h2>
              <p>Character summoning is not available in this production slice.</p>
            </div>
            <span class="home-feature-state unavailable">
              <UiIcon name="lock" />
              <span>Unavailable</span>
            </span>
          </section>
        </aside>
      </div>

      <nav class="home-game-dock" aria-label="Primary navigation">
        <span class="home-dock-item is-active" aria-current="page">
          <UiIcon name="home" />
          <strong>Home</strong>
        </span>
        <button type="button" class="home-dock-item" aria-label="Campaign" onClick={onCampaign}>
          <UiIcon name="campaign" />
          <strong>Campaign</strong>
        </button>
        <button
          type="button"
          class="home-dock-item"
          aria-label="Summon"
          disabled
          title="Summon is not implemented yet"
        >
          <UiIcon name="summon" />
          <strong>Summon</strong>
        </button>
        <button
          type="button"
          class="home-dock-item"
          aria-label="Settings"
          onClick={(event) => onSettings(event.currentTarget)}
        >
          <UiIcon name="settings" />
          <strong>Settings</strong>
        </button>
      </nav>
    </main>
  );
}
