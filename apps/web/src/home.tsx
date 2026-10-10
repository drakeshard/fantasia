import { CampaignSession } from "@fantasia/runtime";
import { useMemo } from "preact/hooks";
import "./home.css";

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
      <div class="home-vignette" aria-hidden="true" />

      <section class="home-continue-panel" aria-label="Continue story">
        <span class="home-compass" aria-hidden="true">
          ✦
        </span>
        <div>
          <p class="home-kicker">Saga {String(view.sagaSequence).padStart(2, "0")}</p>
          <h1>Continue</h1>
          <p>{view.sagaTitle}</p>
          <p>
            Ch. {view.selectedChapterSequence} · {view.selectedChapterTitle}
          </p>
          {currentStage ? <small>{currentStage.title}</small> : null}
        </div>
        <button
          type="button"
          class="home-continue-action"
          onClick={onContinue}
          aria-label="Continue current story"
        >
          <span aria-hidden="true">›</span>
        </button>
      </section>

      <aside class="home-promo-stack" aria-label="Featured content previews">
        <article class="home-promo-card featured">
          <small>Featured</small>
          <strong>Jeanne d’Arc</strong>
          <span>Character showcase</span>
        </article>
        <article class="home-promo-card event">
          <small>Story spotlight</small>
          <strong>Orléans</strong>
          <span>Saga I</span>
        </article>
      </aside>

      <section class="home-utility-strip" aria-label="Account systems">
        <span class="home-utility-pill">Resources —</span>
        <span class="home-utility-icon" aria-hidden="true">
          ✉
        </span>
        <span class="home-utility-icon" aria-hidden="true">
          ◆
        </span>
      </section>

      <section class="home-player-card" aria-label="Player profile">
        <div class="home-player-avatar" aria-hidden="true">
          ✦
        </div>
        <div>
          <strong>Player</strong>
          <small>Fantasia</small>
        </div>
      </section>

      <nav class="home-primary-nav" aria-label="Primary navigation">
        <button type="button" onClick={onCampaign}>
          <span aria-hidden="true">▤</span>
          <strong>Campaign</strong>
        </button>
        <button type="button" aria-label="Summon" disabled title="Summon is not implemented yet">
          <span aria-hidden="true">✦</span>
          <strong>Summon</strong>
          <small>Coming later</small>
        </button>
        <button type="button" onClick={(event) => onSettings(event.currentTarget)}>
          <span aria-hidden="true">⚙</span>
          <strong>Settings</strong>
        </button>
      </nav>

      <section class="home-news-strip" aria-label="News">
        <span class="home-news-label">News</span>
        <strong>Welcome to Fantasia.</strong>
      </section>
    </main>
  );
}
