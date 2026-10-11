import { GameButton } from "./game-controls.js";

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
        <div class="characters-heading">
          <span class="characters-heading-icon" aria-hidden="true">
            <CharactersIcon src="fantasia_ui_icon_characters_default_v001.svg" />
          </span>
          <span>
            <small>Archive</small>
            <h1>Characters</h1>
          </span>
        </div>
        <div class="game-navigation-cluster">
          <div class="game-navigation-end">
            <GameButton icon="home" compactLabel="Home" aria-label="Home" onClick={onHome}>
              Home
            </GameButton>
            <GameButton
              icon="settings"
              compactLabel="Settings"
              aria-label="Settings"
              onClick={(event) => onSettings(event.currentTarget)}
            >
              Settings
            </GameButton>
          </div>
        </div>
      </header>

      <section class="characters-layout" aria-label="Character archive">
        <aside class="characters-roster" aria-label="Known character entries">
          <div class="characters-section-title">
            <small>Known now</small>
            <strong>Character archive</strong>
          </div>

          <div class="character-card is-selected">
            <span class="character-card-crest" aria-hidden="true">
              <CharactersIcon src="fantasia_ui_brand_crest_v001.svg" />
            </span>
            <span class="character-card-copy">
              <strong>Traveler</strong>
              <small>Protagonist · Infantry</small>
            </span>
            <span class="character-card-state">Known</span>
          </div>

          <div class="characters-roster-note">
            <span class="characters-note-mark" aria-hidden="true">+</span>
            <span>
              <strong>More entries can be revealed through the story.</strong>
              <small>
                Future characters stay hidden here until production story state can reveal them safely.
              </small>
            </span>
          </div>
        </aside>

        <article class="character-profile" aria-label="Traveler character profile">
          <div class="character-profile-visual" aria-hidden="true">
            <div class="character-profile-ring">
              <CharactersIcon src="fantasia_ui_brand_crest_v001.svg" />
            </div>
            <span>Traveler</span>
          </div>

          <div class="character-profile-copy">
            <span class="character-profile-kicker">Protagonist profile</span>
            <h2>Traveler</h2>
            <p>
              An aspiring adventurer from Primora in Vaelkrath, stranded far from home after crossing a
              Fracture.
            </p>

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

            <div class="character-profile-boundary" role="note">
              <strong>Character systems are still opening up.</strong>
              <span>
                Levels, numeric stats, skills, equipment, class paths, rarity and recruitment are not
                shown until their production data is authoritative.
              </span>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
