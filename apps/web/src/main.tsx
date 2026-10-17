import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import { type AuthMessage, AuthScreen } from "./auth-screen.js";
import {
  clearPersistedAuthSession,
  persistAuthSession,
  type RestoredFantasiaAccount,
  restoreAccountSession,
} from "./backend/session.js";
import {
  bootstrapAccount,
  consumeFantasiaAuthRedirect,
  isFantasiaBackendConfigured,
  resendSignupConfirmation,
  signInWithPassword,
  signOut,
  signUpWithPassword,
} from "./backend/supabase.js";
import { BattleApp } from "./battle.js";
import { CampaignApp } from "./campaign.js";
import { CharactersApp } from "./characters.js";
import { GameButton } from "./game-controls.js";
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
import { StoryApp } from "./story.js";
import { TalentApp } from "./talent.js";
import "./styles.css";
import "./production.css";
import "./battle-production.css";
import "./settings.css";
import "./root-shell.css";
import "./detail-polish.css";
import "./detail-polish-fixes.css";
import "./art-integration.css";
import "./home-reference.css";
import "./home-fidelity.css";
import "./home-lobby.css";
import "./home-detail.css";
import "./saga-detail.css";
import "./campaign-production.css";
import "./campaign-production-fixes.css";
import "./battle-production-fixes.css";
import "./game-controls.css";
import "./characters.css";
import "./talent.css";
import "./navigation-placement.css";
import "./auth-screen.css";
import "./ui24e1-auth-home.css";

type AppScreen = "home" | "saga" | "campaign" | "characters" | "talent" | "story" | "battle";
type AuthGateStatus = "bypassed" | "checking" | "guest" | "authenticated";

const AUTH_CALLBACK_QUERY_KEYS = [
  "access_token",
  "refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
  "type",
  "error",
  "error_code",
  "error_description",
  "error_uri",
] as const;

function browserStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function hasAuthCallbackPayload(): boolean {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return AUTH_CALLBACK_QUERY_KEYS.some((key) => search.has(key) || hash.has(key));
}

function clearAuthCallbackPayload(): void {
  const url = new URL(window.location.href);
  for (const key of AUTH_CALLBACK_QUERY_KEYS) {
    url.searchParams.delete(key);
  }
  url.hash = "";
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsTriggerRef = useRef<HTMLElement | null>(null);
  const [preferences, setPreferences] = useState(() => loadUiPreferences(browserStorage()));
  const backendConfigured = isFantasiaBackendConfigured();
  const [authGateStatus, setAuthGateStatus] = useState<AuthGateStatus>(() =>
    backendConfigured ? "checking" : "bypassed",
  );
  const [account, setAccount] = useState<RestoredFantasiaAccount | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState<AuthMessage | undefined>();

  useEffect(() => {
    applyUiPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!backendConfigured) return;

    let cancelled = false;
    async function restore() {
      setAuthGateStatus("checking");
      setAuthMessage(undefined);
      try {
        if (hasAuthCallbackPayload()) {
          const redirectedSession = await consumeFantasiaAuthRedirect();
          if (redirectedSession) {
            await persistAuthSession(redirectedSession);
          }
          clearAuthCallbackPayload();
        }
        const restored = await restoreAccountSession();
        if (cancelled) return;
        setAccount(restored);
        setAuthGateStatus(restored ? "authenticated" : "guest");
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setAuthGateStatus("guest");
        setAuthMessage({
          tone: "error",
          text: error instanceof Error ? error.message : "Unable to restore the saved account session.",
        });
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [backendConfigured]);

  async function handleSignIn(email: string, password: string) {
    setAuthBusy(true);
    setAuthMessage(undefined);
    try {
      const session = await signInWithPassword(email, password);
      await persistAuthSession(session);
      const restored = await restoreAccountSession();
      setAccount(restored);
      setAuthGateStatus(restored ? "authenticated" : "guest");
      if (!restored) {
        setAuthMessage({ tone: "error", text: "Account profile could not be restored." });
      }
    } catch (error) {
      console.error(error);
      setAuthMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to sign in.",
      });
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleCreateAccount(email: string, password: string, displayName?: string) {
    setAuthBusy(true);
    setAuthMessage(undefined);
    try {
      const result = await signUpWithPassword(email, password, displayName);
      if (result.session) {
        await persistAuthSession(result.session);
        const restored = await restoreAccountSession();
        setAccount(restored);
        setAuthGateStatus(restored ? "authenticated" : "guest");
        if (!restored) {
          setAuthMessage({ tone: "error", text: "Account profile could not be restored." });
        }
      } else {
        setAuthGateStatus("guest");
        setAuthMessage({
          tone: "success",
          text: "Account created. Confirm your email, then sign in to continue.",
        });
      }
    } catch (error) {
      console.error(error);
      setAuthMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to create the account.",
      });
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleResendConfirmation(email: string) {
    setAuthBusy(true);
    setAuthMessage(undefined);
    try {
      await resendSignupConfirmation(email);
      setAuthMessage({ tone: "success", text: "Confirmation email sent." });
    } catch (error) {
      console.error(error);
      setAuthMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Unable to resend confirmation email.",
      });
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    try {
      await signOut();
    } catch (error) {
      console.error(error);
    } finally {
      clearPersistedAuthSession();
      setAccount(null);
      setAuthMessage(undefined);
      setScreen("home");
      setAuthGateStatus(backendConfigured ? "guest" : "bypassed");
      setAuthBusy(false);
    }
  }

  function openSettings(trigger: HTMLElement) {
    settingsTriggerRef.current = trigger;
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
    requestAnimationFrame(() => settingsTriggerRef.current?.focus());
  }

  function updatePreferences(next: UiPreferences) {
    setPreferences(next);
    saveUiPreferences(next, browserStorage());
  }

  function resetPreferences() {
    const next = defaultUiPreferences();
    setPreferences(next);
    saveUiPreferences(next, browserStorage());
  }

  if (authGateStatus === "checking" || authGateStatus === "guest") {
    return (
      <AuthScreen
        backendConfigured={backendConfigured}
        busy={authBusy}
        restoring={authGateStatus === "checking"}
        {...(authMessage ? { message: authMessage } : {})}
        onSignIn={(email, password) => void handleSignIn(email, password)}
        onCreateAccount={(email, password, displayName) =>
          void handleCreateAccount(email, password, displayName)
        }
        onResendConfirmation={(email) => void handleResendConfirmation(email)}
      />
    );
  }

  return (
    <>
      {screen === "home" ? (
        <HomeApp
          onContinue={() => setScreen("campaign")}
          onCampaign={() => setScreen("saga")}
          onCharacters={() => setScreen("characters")}
          onTalent={() => setScreen("talent")}
          onSettings={openSettings}
        />
      ) : null}
      {screen === "saga" ? (
        <SagaApp
          onBack={() => setScreen("home")}
          onHome={() => setScreen("home")}
          onOpenChapter={() => setScreen("campaign")}
          onSettings={openSettings}
        />
      ) : null}
      {screen === "campaign" ? (
        <CampaignApp
          onBack={() => setScreen("saga")}
          onHome={() => setScreen("home")}
          onViewStory={() => setScreen("story")}
          onEnterBattle={() => setScreen("battle")}
          onSettings={openSettings}
        />
      ) : null}
      {screen === "characters" ? (
        <CharactersApp
          onBack={() => setScreen("home")}
          onHome={() => setScreen("home")}
          onSettings={openSettings}
        />
      ) : null}
      {screen === "talent" ? (
        <TalentApp
          onBack={() => setScreen("home")}
          onHome={() => setScreen("home")}
          onSettings={openSettings}
        />
      ) : null}
      {screen === "story" ? (
        <StoryApp
          onBack={() => setScreen("campaign")}
          onHome={() => setScreen("home")}
          onContinue={() => setScreen("battle")}
          onSettings={openSettings}
        />
      ) : null}
      {screen === "battle" ? (
        <BattleApp
          onBack={() => setScreen("campaign")}
          onHome={() => setScreen("home")}
          onSettings={openSettings}
        />
      ) : null}

      <SettingsDialog
        open={settingsOpen}
        preferences={preferences}
        onChange={updatePreferences}
        onReset={resetPreferences}
        onClose={closeSettings}
        {...(backendConfigured && account
          ? {
              accountLabel: account.profile.displayName,
              accountDetail: account.email ?? account.userId,
              signOutBusy: authBusy,
              onSignOut: () => void handleSignOut(),
            }
          : {})}
      />
    </>
  );
}

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app root");

render(<App />, root);
