import { CampaignSession } from "@fantasia/runtime";
import { useMemo } from "preact/hooks";

interface HomeAppProps {
  readonly onContinue: () => void;
  readonly onCampaign: () => void;
  readonly onSettings: (trigger: HTMLElement) => void;
}

export function HomeApp({ onContinue, onCampaign, onSettings }: HomeAppProps) {
  const session = useMemo(() => new CampaignSession(), []);
  const view = session.view();
  const currentStage = view.stages.find((stage) => stage.current) ?? view.stages[0];

  return (
    <main class="home-screen" aria-label="Fantasia home">
      <header class="home-topbar">
        <div class="home-wordmark">
          <span class="home-wordmark-mark" aria-hidden="true">
            <span>✦</span>
          </span>
          <span class="home-wordmark-copy">
            <strong>FANTASIA</strong>
            <small>Chronicles beyond the fracture</small>
          </span>
        </div>
        <div class="home-top-actions">
          <span class="fantasia-chip">Story campaign</span>
          <button
            type="button"
            class="home-top-action"
            disabled
            title="Account services are not implemented"
          >
            Account —
          </button>
        </div>
      </header>

      <div class="home-main-layout">
        <section class="home-hero-copy" aria-labelledby="home-hero-title">
          <p class="home-kicker fantasia-ornament">Current journey</p>
          <h1 id="home-hero-title" class="home-hero-title">
            <span>Step beyond</span>
            <em>history.</em>
          </h1>
          <p class="home-hero-lede">
            Follow the current campaign, review the active saga, and return to the chapter exactly
            where you left it.
          </p>

          <section class="home-story-card" aria-label="Continue current story">
            <div class="home-story-seal" aria-hidden="true">
              {view.sagaSequence}
            </div>
            <div class="home-story-copy">
              <p class="home-kicker">Saga {String(view.sagaSequence).padStart(2, "0")}</p>
              <h2>{view.sagaTitle}</h2>
              <p>
                Chapter {String(view.selectedChapterSequence).padStart(2, "0")} ·{" "}
                {view.selectedChapterTitle}
              </p>
              {currentStage ? <small>Current stage · {currentStage.title}</small> : null}
            </div>
            <button
              type="button"
              class="home-story-continue"
              aria-label="Continue current story"
              onClick={onContinue}
            >
              <span>Continue</span>
              <span aria-hidden="true">›</span>
            </button>
          </section>
        </section>

        <aside class="home-command-column" aria-label="Main menu">
          <div class="home-command-crown" aria-hidden="true">✦</div>
          <div class="home-command-heading">
            <div>
              <p class="home-kicker">Main menu</p>
              <h2>Choose your path</h2>
            </div>
            <p>Player-facing systems only</p>
          </div>

          <nav class="home-primary-nav" aria-label="Primary navigation">
            <button type="button" aria-label="Campaign" onClick={onCampaign}>
              <span aria-hidden="true">▤</span>
              <span class="home-nav-copy">
                <strong>Campaign</strong>
                <small>Review Saga I and choose the current chapter.</small>
              </span>
              <span class="home-nav-arrow" aria-hidden="true">
                ›
              </span>
            </button>
            <button
              type="button"
              aria-label="Summon"
              disabled
              title="Summon is not implemented yet"
            >
              <span aria-hidden="true">✦</span>
              <span class="home-nav-copy">
                <strong>Summon</strong>
                <small>Unavailable until its gameplay systems exist.</small>
              </span>
              <span class="home-nav-arrow" aria-hidden="true">
                —
              </span>
            </button>
            <button
              type="button"
              aria-label="Settings"
              onClick={(event) => onSettings(event.currentTarget)}
            >
              <span aria-hidden="true">⚙</span>
              <span class="home-nav-copy">
                <strong>Settings</strong>
                <small>Interface scale, motion, and campaign labels.</small>
              </span>
              <span class="home-nav-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          </nav>

          <p class="home-quiet-note">
            Unsupported account, currency, reward, mail, shop, and live-event systems are omitted
            rather than represented with fabricated values.
          </p>
        </aside>
      </div>

      <footer class="home-footer">
        <strong>{view.sagaTitle}</strong>
        <span>Current production campaign · interface-only presentation</span>
      </footer>
    </main>
  );
}
