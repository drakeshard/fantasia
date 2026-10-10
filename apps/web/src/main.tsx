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
import { SettingsDialog } from "./settings-dialog.js";
import "./styles.css";
import "./production.css";
import "./settings.css";

type AppScreen = "home" | "campaign" | "battle";
type CampaignEntryMode = "overview" | "chapter";

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
  const [campaignEntryMode, setCampaignEntryMode] = useState<CampaignEntryMode>("overview");
  const [preferences, setPreferences] = useState<UiPreferences>(initialPreferences.preferences);
  const [storageMessage, setStorageMessage] = useState<string | undefined>(initialPreferences.message);
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

  function openCampaign(mode: CampaignEntryMode) {
    setCampaignEntryMode(mode);
    setScreen("campaign");
  }

  return (
    <>
      {screen === "battle" ? (
        <BattleApp onReturnCampaign={() => openCampaign("chapter")} />
      ) : screen === "campaign" ? (
        <CampaignApp
          key={campaignEntryMode}
          initialScreen={campaignEntryMode}
          onHome={() => setScreen("home")}
          onOpenBattle={() => setScreen("battle")}
          onOpenSettings={openSettings}
        />
      ) : (
        <HomeApp
          onContinue={() => openCampaign("chapter")}
          onCampaign={() => openCampaign("overview")}
          onSettings={openSettings}
        />
      )}

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
