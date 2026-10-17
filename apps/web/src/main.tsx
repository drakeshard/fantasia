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
import "./ui24e2-saga-chapter.css";

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

function queryDevMode(): string | null {
  return new URLSearchParams(window.location.search).get("dev");
}

function initialScreen(): AppScreen {
  return queryDevMode() === "battle" ? "battle" : "home";
}

function isLandscapeViewport() {
  return window.innerWidth >= window.innerHeight;
}

function authErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Fantasia could not complete the account request. Please try again.";
}

function authConfirmationReturnUrl(): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  return url.toString();
}

function clearAuthCallbackFromLocation() {
  const url = new URL(window.location.href);
  for (const key of AUTH_CALLBACK_QUERY_KEYS) url.searchParams.delete(key);
  url.hash = "";
  const clean = `${url.pathname}${url.search}` || "/";
  window.history.replaceState(window.history.state, "", clean);
}

function OrientationGate() {
  return (
    <main class="orientation-gate" aria-label="Landscape orientation required">
      <div class="orientation-gate-card">
        <div class="orientation-device" aria-hidden="true">
          <span />
        </div>
        <p>Fantasia is designed for a wide battlefield view.</p>
        <h1>Rotate your device</h1>
        <p class="orientation-gate-detail">Landscape orientation is required to continue.</p>
      </div>
    </main>
  );
}

function App() {
  const initialPreferences = loadUiPreferences(browserStorage());
  const backendConfigured = isFantasiaBackendConfigured();
  const authPreview = queryDevMode() === "auth";
  const [screen, setScreen] = useState<AppScreen>(() => initialScreen());
  const [storyNodeId, setStoryNodeId] = useState<string>();
  const [preferences, setPreferences] = useState<UiPreferences>(initialPreferences.preferences);
  const [storageMessage, setStorageMessage] = useState<string | undefined>(
    initialPreferences.message,
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [landscape, setLandscape] = useState(() => isLandscapeViewport());
  const [account, setAccount] = useState<RestoredFantasiaAccount | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthGateStatus>(() => {
    if (authPreview) return "guest";
    return backendConfigured ? "checking" : "bypassed";
  });
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState<AuthMessage>();
  const [signOutBusy, setSignOutBusy] = useState(false);
  const settingsTrigger = useRef<HTMLElement>();

  useEffect(() => {
    applyUiPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const updateOrientation = () => setLandscape(isLandscapeViewport());
    window.addEventListener("resize", updateOrientation);
    window.addEventListener("orientationchange", updateOrientation);
    return () => {
      window.removeEventListener("resize", updateOrientation);
      window.removeEventListener("orientationchange", updateOrientation);
    };
  }, []);

  useEffect(() => {
    if (!backendConfigured || authPreview) return;
    let active = true;

    void (async () => {
      try {
        const confirmation = await consumeFantasiaAuthRedirect(window.location.href);
        if (!active) return;
        if (confirmation.handled) clearAuthCallbackFromLocation();

        if (confirmation.error) {
          setAuthMessage({
            tone: "error",
            text: `${confirmation.error} Request a new confirmation email below if needed.`,
          });
          setAuthStatus("guest");
          return;
        }

        if (confirmation.session) {
          await enterAuthenticatedSession(confirmation.session);
          return;
        }

        const restored = await restoreAccountSession();
        if (!active) return;
        if (restored) {
          setAccount(restored);
          setAuthStatus("authenticated");
          return;
        }
        setAuthStatus("guest");
      } catch (error: unknown) {
        if (!active) return;
        clearAuthCallbackFromLocation();
        setAuthMessage({ tone: "error", text: authErrorMessage(error) });
        setAuthStatus("guest");
      }
    })();

    return () => {
      active = false;
    };
  }, [authPreview, backendConfigured]);

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

  async function enterAuthenticatedSession(
    session: RestoredFantasiaAccount["session"],
    displayName?: string,
  ) {
    const profile = await bootstrapAccount(session.accessToken, displayName);
    const remembered = persistAuthSession(session);
    setAccount({ session, profile });
    setAuthStatus("authenticated");
    setAuthMessage(
      remembered
        ? undefined
        : {
            tone: "info",
            text: "Signed in for this session, but this browser could not save the login for automatic restore.",
          },
    );
  }

  async function handleSignIn(email: string, password: string) {
    setAuthBusy(true);
    setAuthMessage(undefined);
    try {
      const session = await signInWithPassword(email, password);
      await enterAuthenticatedSession(session);
    } catch (error) {
      setAuthMessage({ tone: "error", text: authErrorMessage(error) });
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleCreateAccount(email: string, password: string, displayName?: string) {
    setAuthBusy(true);
    setAuthMessage(undefined);
    try {
      const result = await signUpWithPassword(email, password, authConfirmationReturnUrl());
      if (!result.session) {
        setAuthMessage({
          tone: "success",
          text: "Account request accepted. Check your email for a confirmation link. The link will return you to Fantasia and finish account access automatically.",
        });
        return;
      }
      await enterAuthenticatedSession(result.session, displayName);
    } catch (error) {
      setAuthMessage({ tone: "error", text: authErrorMessage(error) });
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleResendConfirmation(email: string) {
    if (!email.trim()) return;
    setAuthBusy(true);
    setAuthMessage(undefined);
    try {
      await resendSignupConfirmation(email.trim(), authConfirmationReturnUrl());
      setAuthMessage({
        tone: "success",
        text: "Confirmation email sent. Use the newest confirmation link to return to Fantasia.",
      });
    } catch (error) {
      setAuthMessage({ tone: "error", text: authErrorMessage(error) });
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    if (!account || signOutBusy) return;
    setSignOutBusy(true);
    let remoteRevocationConfirmed = true;
    try {
      await signOut(account.session.accessToken);
    } catch {
      remoteRevocationConfirmed = false;
    } finally {
      clearPersistedAuthSession();
      setAccount(null);
      setSettingsOpen(false);
      setScreen("home");
      setAuthStatus("guest");
      setAuthMessage({
        tone: remoteRevocationConfirmed ? "success" : "info",
        text: remoteRevocationConfirmed
          ? "Signed out successfully."
          : "Signed out on this browser. Server session revocation could not be confirmed.",
      });
      setSignOutBusy(false);
    }
  }

  if (authStatus === "checking") {
    return (
      <AuthScreen
        backendConfigured={backendConfigured}
        busy={false}
        restoring
        onSignIn={() => undefined}
        onCreateAccount={() => undefined}
        onResendConfirmation={() => undefined}
      />
    );
  }

  if (authStatus === "guest") {
    return (
      <AuthScreen
        backendConfigured={backendConfigured}
        busy={authBusy}
        {...(authMessage === undefined ? {} : { message: authMessage })}
        onSignIn={(email, password) => void handleSignIn(email, password)}
        onCreateAccount={(email, password, displayName) =>
          void handleCreateAccount(email, password, displayName)
        }
        onResendConfirmation={(email) => void handleResendConfirmation(email)}
      />
    );
  }

  if (!landscape) return <OrientationGate />;

  const accountSettings = account
    ? {
        displayName: account.profile.displayName,
        ...(account.session.user.email === undefined ? {} : { email: account.session.user.email }),
      }
    : undefined;

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

      {screen === "characters" ? (
        <CharactersApp onHome={() => setScreen("home")} onSettings={openSettings} />
      ) : null}

      {screen === "talent" ? (
        <TalentApp onHome={() => setScreen("home")} onSettings={openSettings} />
      ) : null}

      {screen === "saga" ? (
        <SagaApp
          onHome={() => setScreen("home")}
          onContinue={() => setScreen("campaign")}
          onSettings={openSettings}
        />
      ) : null}

      <div class="campaign-rooted-shell" hidden={screen !== "campaign"}>
        <CampaignApp
          onEnterStory={(nodeId) => {
            setStoryNodeId(nodeId);
            setScreen("story");
          }}
        />
        <nav
          class="campaign-root-navigation game-navigation-cluster"
          aria-label="Campaign root navigation"
        >
          <div class="game-navigation-start">
            <GameButton
              icon="back"
              compactLabel="Back"
              aria-label="Back"
              onClick={() => setScreen("saga")}
            >
              Back to Saga
            </GameButton>
          </div>
          <div class="game-navigation-end">
            <GameButton
              icon="home"
              compactLabel="Home"
              aria-label="Home"
              onClick={() => setScreen("home")}
            >
              Home
            </GameButton>
            <GameButton
              icon="settings"
              compactLabel="Settings"
              aria-label="Settings"
              onClick={(event) => openSettings(event.currentTarget)}
            >
              Settings
            </GameButton>
          </div>
        </nav>
      </div>

      {screen === "story" && storyNodeId ? (
        <StoryApp
          nodeId={storyNodeId}
          onReturnCampaign={() => setScreen("campaign")}
          onHome={() => setScreen("home")}
          onSettings={openSettings}
        />
      ) : null}

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
        {...(accountSettings === undefined
          ? {}
          : {
              account: accountSettings,
              signOutBusy,
              onSignOut: () => void handleSignOut(),
            })}
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
