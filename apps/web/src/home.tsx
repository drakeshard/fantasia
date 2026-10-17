import { CampaignSession } from "@fantasia/runtime";
import { useMemo } from "preact/hooks";
import { GameUtilityCluster } from "./game-controls.js";
import { runtimeAssetUrl } from "./runtime-assets.js";
import { UiBadge, UiButton, UiPanel } from "./ui/primitives.js";

interface HomeAppProps {
  readonly onContinue: () => void;
  readonly onCampaign: () => void;
  readonly onCharacters: () => void;
  readonly onTalent: () => void;
  readonly onSettings: (trigger: HTMLElement) => void;
}

interface HomeIconProps {
  readonly assetId: string;
  readonly className?: string;
}

function HomeIcon({ assetId, className }: HomeIconProps) {
  return (
    <img
      class={`home-icon${className ? ` ${className}` : ""}`}
      src={runtimeAssetUrl(assetId)}
      alt=""
    />
  );
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
            <HomeIcon assetId="ui.brand.crest" />
          </span>
          <span class="home-wordmark-copy">
            <strong>FANTASIA</strong>
            <small>Chronicles beyond the fracture</small>
          </span>
        </div>
        <div class="home-lobby-hud-end">
          <UiBadge class="home-lobby-status" tone="neutral">
            <span class="home-status-dot" aria-hidden="true" />
            <span>Story campaign</span>
          </UiBadge>
          <GameUtilityCluster onSettings={onSettings} />
        </div>
      </header>

      <div class="home-lobby-field">
        <section class="home-lobby-stage" aria-label="Current journey">
          <div class="home-stage-label">
            <span>Current journey</span>
            <strong>{view.sagaTitle}</strong>
          </div>

          <UiPanel class="home-current-story" tone="overlay" ariaLabel="Continue current story">
            <div class="home-current-story-mark" aria-hidden="true">
              <HomeIcon assetId="ui.icon.campaign" />
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
            <UiButton
              class="home-current-story-continue"
              tone="primary"
              aria-label="Continue current story"
              onClick={onContinue}
            >
              <span>Continue</span>
              <HomeIcon assetId="ui.icon.chevron-right" className="home-action-chevron" />
            </UiButton>
          </UiPanel>
        </section>

        <aside class="home-feature-rail" aria-label="Home highlights">
          <UiPanel class="home-feature-card home-feature-current" tone="overlay">
            <span class="home-feature-kicker">Current Saga</span>
            <div class="home-feature-emblem" aria-hidden="true">
              <HomeIcon assetId="ui.icon.campaign" />
              <span>I</span>
            </div>
            <h2>{view.sagaTitle}</h2>
            <p>{view.selectedChapterTitle}</p>
            {currentStage ? <small>{currentStage.title}</small> : null}
            <div class="home-feature-rule" aria-hidden="true" />
            <UiBadge class="home-feature-state" tone="positive">
              Campaign ready
            </UiBadge>
          </UiPanel>

          <UiPanel
            class="home-feature-card home-feature-locked"
            tone="overlay"
            ariaLabel="Summon unavailable"
          >
            <span class="home-feature-kicker">Summon</span>
            <div class="home-feature-emblem summon" aria-hidden="true">
              <HomeIcon assetId="ui.icon.summon" />
            </div>
            <h2>Summon</h2>
            <p>Character summoning is not available in this production slice.</p>
            <UiBadge class="home-feature-state unavailable" tone="neutral">
              <HomeIcon assetId="ui.icon.lock" />
              <span>Unavailable</span>
            </UiBadge>
          </UiPanel>
        </aside>
      </div>

      <nav class="home-game-dock" aria-label="Primary navigation">
        <span class="home-dock-item is-active" aria-current="page">
          <HomeIcon assetId="ui.icon.home" />
          <strong>Home</strong>
        </span>
        <UiButton class="home-dock-item" tone="quiet" aria-label="Campaign" onClick={onCampaign}>
          <HomeIcon assetId="ui.icon.campaign" />
          <strong>Campaign</strong>
        </UiButton>
        <UiButton
          class="home-dock-item"
          tone="quiet"
          aria-label="Characters"
          onClick={onCharacters}
        >
          <HomeIcon assetId="ui.icon.characters" />
          <strong>Characters</strong>
        </UiButton>
        <UiButton class="home-dock-item" tone="quiet" aria-label="Talent" onClick={onTalent}>
          <HomeIcon assetId="ui.icon.talent" />
          <strong>Talent</strong>
        </UiButton>
        <UiButton
          class="home-dock-item"
          tone="quiet"
          aria-label="Summon"
          disabled
          title="Summon is not implemented yet"
        >
          <HomeIcon assetId="ui.icon.summon" />
          <strong>Summon</strong>
        </UiButton>
      </nav>
    </main>
  );
}
