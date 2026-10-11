import { CampaignSession } from "@fantasia/runtime";
import { useMemo } from "preact/hooks";
import { GameUtilityCluster } from "./game-controls.js";

interface HomeAppProps {
  readonly onContinue: () => void;
  readonly onCampaign: () => void;
  readonly onCharacters: () => void;
  readonly onTalent: () => void;
  readonly onSettings: (trigger: HTMLElement) => void;
}

const uiAsset = (name: string) => `/assets/ui/core/${name}`;

interface HomeIconProps {
  readonly src: string;
  readonly className?: string;
}

function HomeIcon({ src, className }: HomeIconProps) {
  return <img class={`home-icon${className ? ` ${className}` : ""}`} src={uiAsset(src)} alt="" />;
}

export function HomeApp({
  onContinue,
  onCampaign,
  onCharacters,
  onTalent,
  onSettings,
}: HomeAppProps) {
  const session = useMemo(() => new CampaignSession(), []);
  const view = session.view();
  const currentStage = view.stages.find((stage) => stage.current) ?? view.stages[0];

  return (
    <main class="home-screen home-lobby" aria-label="Fantasia home">
      <header class="home-lobby-hud">
        <div class="home-wordmark">
          <span class="home-wordmark-mark" aria-hidden="true">
            <HomeIcon src="fantasia_ui_brand_crest_v001.svg" />
          </span>
          <span class="home-wordmark-copy">
            <strong>FANTASIA</strong>
            <small>Chronicles beyond the fracture</small>
          </span>
        </div>
        <div class="home-lobby-hud-end">
          <div class="home-lobby-status">
            <span class="home-status-dot" aria-hidden="true" />
            <span>Story campaign</span>
          </div>
          <GameUtilityCluster onSettings={onSettings} />
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
              <HomeIcon src="fantasia_ui_icon_campaign_default_v001.svg" />
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
              <HomeIcon
                src="fantasia_ui_icon_chevron_right_v001.svg"
                className="home-action-chevron"
              />
            </button>
          </section>
        </section>

        <aside class="home-feature-rail" aria-label="Home highlights">
          <section class="home-feature-card home-feature-current">
            <span class="home-feature-kicker">Current Saga</span>
            <div class="home-feature-emblem" aria-hidden="true">
              <HomeIcon src="fantasia_ui_icon_campaign_default_v001.svg" />
              <span>I</span>
            </div>
            <h2>{view.sagaTitle}</h2>
            <p>{view.selectedChapterTitle}</p>
            {currentStage ? <small>{currentStage.title}</small> : null}
            <div class="home-feature-rule" aria-hidden="true" />
            <span class="home-feature-state">Campaign ready</span>
          </section>

          <section class="home-feature-card home-feature-locked" aria-label="Summon unavailable">
            <span class="home-feature-kicker">Summon</span>
            <div class="home-feature-emblem summon" aria-hidden="true">
              <HomeIcon src="fantasia_ui_icon_summon_default_v001.svg" />
            </div>
            <h2>Summon</h2>
            <p>Character summoning is not available in this production slice.</p>
            <span class="home-feature-state unavailable">
              <HomeIcon src="fantasia_ui_icon_lock_v001.svg" />
              <span>Unavailable</span>
            </span>
          </section>
        </aside>
      </div>

      <nav class="home-game-dock" aria-label="Primary navigation">
        <span class="home-dock-item is-active" aria-current="page">
          <HomeIcon src="fantasia_ui_icon_home_default_v001.svg" />
          <strong>Home</strong>
        </span>
        <button type="button" class="home-dock-item" aria-label="Campaign" onClick={onCampaign}>
          <HomeIcon src="fantasia_ui_icon_campaign_default_v001.svg" />
          <strong>Campaign</strong>
        </button>
        <button type="button" class="home-dock-item" aria-label="Characters" onClick={onCharacters}>
          <HomeIcon src="fantasia_ui_icon_characters_default_v001.svg" />
          <strong>Characters</strong>
        </button>
        <button type="button" class="home-dock-item" aria-label="Talent" onClick={onTalent}>
          <HomeIcon src="fantasia_ui_icon_talent_default_v001.svg" />
          <strong>Talent</strong>
        </button>
        <button
          type="button"
          class="home-dock-item"
          aria-label="Summon"
          disabled
          title="Summon is not implemented yet"
        >
          <HomeIcon src="fantasia_ui_icon_summon_default_v001.svg" />
          <strong>Summon</strong>
        </button>
      </nav>
    </main>
  );
}
