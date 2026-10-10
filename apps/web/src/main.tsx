import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { BattleApp } from "./battle.js";
import { CampaignApp } from "./campaign.js";
import { HomeApp } from "./home.js";
import {
  applyUiPreferences,
  defaultUiPreferences,
  loadUiPreferences,
  resetUiPreferences,
  saveUiPreferences,
  type UiPreferences,
} from "./preferences.js";
import { SagaApp } from "./saga.js";
import { SettingsDialog } from "./settings-dialog.js";
import "./styles.css";
import "./production.css";
import "./settings.css";
import "./root-shell.css";
import "./detail-polish.css";
import "./detail-polish-fixes.css";

type AppScreen = "home" | "saga" | "campaign" | "battle";

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function initialScreen(): AppScreen {
  return new URLSearchParams(window.location.search).get("dev") === "battle" ? "battle" : "home";
}

function App() {
  const initialPreferences = loadUiPreferences(browserStorage());
  const [screen, setScreen] = useState<AppScreen>(() => initialScreen());
  const [preferences, setPreferences] = useState<UiPreferences>(initialPreferences.preferences);
  const [storageMessage, setStorageMessage] = useState<string | undefined>(
    initialPreferences.message,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsTrigger = useRef<HTMLElement>();

  useEffect(() => {
    applyUiPreferences(preferences);
  }, [preferences]);

  function openSettings(trigger: HTMLElement) {
    settingsTrigger.current = trigger;
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
    requestAnimationFrame(() => settingsTrigger.current?.focus());
  }

  function changePreferences(next: UiPreferences) {
    setPreferences(next);
    const result = saveUiPreferences(browserStorage(), next);
    setStorageMessage(result.message);
  }

  function resetPreferences() {
    const next = defaultUiPreferences();
    setPreferences(next);
    const result = resetUiPreferences(browserStorage());
    setStorageMessage(result.message);
  }

  function retryPreferenceStorage() {
    const result = saveUiPreferences(browserStorage(), preferences);
    setStorageMessage(result.message ?? "Interface preferences are saved in this browser.");
  }

  return (
    <>
      {screen === "home" ? (
        <HomeApp
          onContinue={() => setScreen("campaign")}
          onCampaign={() => setScreen("saga")}
          onSettings={openSettings}
        />
      ) : null}

      {screen === "saga" ? (
        <SagaApp
          onHome={() => setScreen("home")}
          onContinue={() => setScreen("campaign")}
          onSettings={openSettings}
        />
      ) : null}

      <div class="campaign-rooted-shell" hidden={screen !== "campaign"}>
        <CampaignApp onOpenBattle={() => setScreen("battle")} />
        <nav class="campaign-root-navigation" aria-label="Campaign root navigation">
          <button type="button" onClick={() => setScreen("saga")}>
            Back
          </button>
          <button type="button" onClick={() => setScreen("home")}>
            Home
          </button>
          <button type="button" onClick={(event) => openSettings(event.currentTarget)}>
            Settings
          </button>
        </nav>
      </div>

      {screen === "battle" ? <BattleApp onReturnCampaign={() => setScreen("campaign")} /> : null}

      {screen === "battle" ? (
        <button
          type="button"
          aria-label="Settings"
          class="global-settings-launcher ui-button secondary battle"
          onClick={(event) => openSettings(event.currentTarget)}
        >
          Settings
        </button>
      ) : null}

      <SettingsDialog
        open={settingsOpen}
        preferences={preferences}
        {...(storageMessage === undefined ? {} : { storageMessage })}
        onChange={changePreferences}
        onReset={resetPreferences}
        onRetryStorage={retryPreferenceStorage}
        onClose={closeSettings}
      />
    </>
  );
}

const root = document.getElementById("app");
if (!root) throw new Error("Fantasia root element was not found.");
render(<App />, root);
