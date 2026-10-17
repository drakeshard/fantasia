import { GameUtilityCluster } from "./game-controls.js";
import { UiArtFrame, UiBadge, UiPanel, UiTitleLockup } from "./ui/primitives.js";

interface CharactersAppProps {
  readonly onHome: () => void;
  readonly onSettings: (trigger: HTMLElement) => void;
}

const uiAsset = (name: string) => `/assets/ui/core/${name}`;

function CharactersIcon({ src }: { readonly src: string }) {
  return <img class="characters-icon" src={uiAsset(src)} alt="" />;
}

export function CharactersApp({ onHome, onSettings }: CharactersAppProps) {
  return (
    <main class="characters-screen" aria-label="Characters">
      <header class="characters-hud">
        <UiTitleLockup
          class="characters-heading"
          eyebrow="Archive"
          title="Characters"
          ornament={<CharactersIcon src="fantasia_ui_icon_characters_default_v001.svg" />}
        />
        <GameUtilityCluster onHome={onHome} onSettings={onSettings} />
      </header>

      <section class="characters-layout" aria-label="Character archive">
        <aside class="characters-roster" aria-label="Known character entries">
          <div class="characters-section-title">
            <small>Known now</small>
            <strong>Character archive</strong>
          </div>

          <UiPanel class="character-card is-selected" tone="raised" ariaLabel="Selected character">
            <span class="character-card-crest" aria-hidden="true">
              <CharactersIcon src="fantasia_ui_brand_crest_v001.svg" />
            </span>
            <span class="character-card-copy">
              <strong>Traveler</strong>
              <small>Protagonist · Infantry</small>
            </span>
            <UiBadge class="character-card-state" tone="positive">
              Known
            </UiBadge>
          </UiPanel>

          <UiPanel class="characters-roster-note" ariaLabel="Character reveal boundary">
            <span class="characters-note-mark" aria-hidden="true">
              +
            </span>
            <span>
              <strong>More entries can be revealed through the story.</strong>
              <small>
                Future characters stay hidden here until production story state can reveal them
                safely.
              </small>
            </span>
          </UiPanel>
        </aside>

        <article class="character-profile" aria-label="Traveler character profile">
          <UiArtFrame class="character-profile-visual" label="Traveler">
            <div class="character-profile-ring" aria-hidden="true">
              <CharactersIcon src="fantasia_ui_brand_crest_v001.svg" />
            </div>
          </UiArtFrame>

          <div class="character-profile-copy">
            <UiTitleLockup
              class="character-profile-title"
              eyebrow="Protagonist profile"
              title="Traveler"
              detail="An aspiring adventurer from Primora in Vaelkrath, stranded far from home after crossing a Fracture."
            />

            <dl class="character-profile-facts">
              <div>
                <dt>Origin</dt>
                <dd>Primora · Vaelkrath</dd>
              </div>
              <div>
                <dt>Class</dt>
                <dd>Infantry</dd>
              </div>
              <div>
                <dt>Current identity</dt>
                <dd>Traveler</dd>
              </div>
              <div>
                <dt>Campaign</dt>
                <dd>The Maid of France</dd>
              </div>
            </dl>

            <UiPanel class="character-profile-boundary" tone="overlay" ariaLabel="Character system boundary">
              <strong>Character systems are still opening up.</strong>
              <span>
                Levels, numeric stats, skills, equipment, class paths, rarity and recruitment are
                not shown until their production data is authoritative.
              </span>
            </UiPanel>
          </div>
        </article>
      </section>
    </main>
  );
}
