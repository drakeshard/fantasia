import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { BattleApp } from "./battle.js";
import { CampaignApp } from "./campaign.js";
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

type AppScreen = "campaign" | "battle";

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function App() {
  const initialPreferences = loadUiPreferences(browserStorage());
  const [screen, setScreen] = useState<AppScreen>("campaign");
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
      {screen === "battle" ? (
        <BattleApp onReturnCampaign={() => setScreen("campaign")} />
      ) : (
        <CampaignApp onOpenBattle={() => setScreen("battle")} />
      )}
      <button
        type="button"
        aria-label="Settings"
        class={`global-settings-launcher ui-button secondary ${screen}`}
        onClick={(event) => openSettings(event.currentTarget)}
      >
        Settings
      </button>
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
