import type { JSX } from "preact";
import { useState } from "preact/hooks";
import { UiButton, UiPanel } from "./ui/primitives.js";

// Auth presentation stays title-local; credential/session authority remains in the backend modules.
export interface AuthMessage {
  readonly tone: "error" | "info" | "success";
  readonly text: string;
}

interface AuthScreenProps {
  readonly backendConfigured: boolean;
  readonly busy: boolean;
  readonly restoring?: boolean;
  readonly message?: AuthMessage;
  readonly onSignIn: (email: string, password: string) => void;
  readonly onCreateAccount: (email: string, password: string, displayName?: string) => void;
  readonly onResendConfirmation: (email: string) => void;
}

type AuthMode = "sign-in" | "create-account";

export function AuthScreen({
  backendConfigured,
  busy,
  restoring = false,
  message,
  onSignIn,
  onCreateAccount,
  onResendConfirmation,
}: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const createMode = mode === "create-account";
  const canResend = backendConfigured && !busy && !restoring && email.trim().length > 0;

  function submit(event: JSX.TargetedSubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || restoring) return;
    if (createMode) {
      onCreateAccount(email.trim(), password, displayName.trim() || undefined);
      return;
    }
    onSignIn(email.trim(), password);
  }

  return (
    <main class="auth-screen" aria-label="Fantasia account access">
      <div class="auth-screen-art" aria-hidden="true" />

      <section class="auth-brand-panel" aria-label="Fantasia">
        <div class="auth-brand-mark">
          <img src="/assets/ui/core/fantasia_ui_brand_crest_v001.svg" alt="" />
        </div>
        <div class="auth-brand-copy">
          <span>Drakeshard Studios</span>
          <h1>FANTASIA</h1>
          <p>Chronicles beyond the fracture</p>
        </div>
        <div class="auth-brand-story">
          <span>Continue your journey</span>
          <strong>One account. One persistent campaign.</strong>
          <p>Your current account carries approved player progress between browser sessions.</p>
        </div>
      </section>

      <section class="auth-panel" aria-live="polite">
        <UiPanel class="auth-panel-frame" tone="overlay" ariaLabel="Account access">
          {restoring ? (
            <div class="auth-restoring" role="status">
              <span class="auth-restoring-mark" aria-hidden="true" />
              <p>Restoring your account</p>
              <h2>Returning to Fantasia…</h2>
              <small>Checking the saved session and account profile.</small>
            </div>
          ) : (
            <>
              <header class="auth-panel-header">
                <span>Account access</span>
                <h2>{createMode ? "Create your account" : "Welcome back"}</h2>
                <p>
                  {createMode
                    ? "Create a Fantasia account with email and password."
                    : "Sign in to restore your Fantasia account and persistent state."}
                </p>
              </header>

              <fieldset class="auth-mode-switch">
                <legend>Account access mode</legend>
                <UiButton
                  class={!createMode ? "is-active" : ""}
                  tone="quiet"
                  selected={!createMode}
                  onClick={() => setMode("sign-in")}
                  disabled={busy}
                >
                  Sign in
                </UiButton>
                <UiButton
                  class={createMode ? "is-active" : ""}
                  tone="quiet"
                  selected={createMode}
                  onClick={() => setMode("create-account")}
                  disabled={busy}
                >
                  Create account
                </UiButton>
              </fieldset>

              <form class="auth-form" onSubmit={submit}>
                {createMode ? (
                  <label class="auth-field">
                    <span>
                      Display name <small>Optional</small>
                    </span>
                    <input
                      type="text"
                      value={displayName}
                      maxLength={40}
                      autocomplete="nickname"
                      placeholder="Name shown on your account"
                      onInput={(event) => setDisplayName(event.currentTarget.value)}
                      disabled={busy}
                    />
                  </label>
                ) : null}

                <label class="auth-field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={email}
                    autocomplete="email"
                    inputMode="email"
                    placeholder="you@example.com"
                    required
                    onInput={(event) => setEmail(event.currentTarget.value)}
                    disabled={busy}
                  />
                </label>

                <div class="auth-field">
                  <span id="auth-password-label">Password</span>
                  <div class="auth-password-field">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      autocomplete={createMode ? "new-password" : "current-password"}
                      aria-labelledby="auth-password-label"
                      placeholder="Enter your password"
                      required
                      onInput={(event) => setPassword(event.currentTarget.value)}
                      disabled={busy}
                    />
                    <UiButton
                      class="auth-password-toggle"
                      tone="quiet"
                      onClick={() => setShowPassword((current) => !current)}
                      disabled={busy}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </UiButton>
                  </div>
                </div>

                {message ? (
                  <div
                    class={`auth-message ${message.tone}`}
                    role={message.tone === "error" ? "alert" : "status"}
                  >
                    {message.text}
                  </div>
                ) : null}

                {!backendConfigured ? (
                  <div class="auth-message info" role="status">
                    Backend configuration is not available in this build. This screen is in preview
                    mode.
                  </div>
                ) : null}

                <UiButton
                  class="auth-submit"
                  tone="primary"
                  type="submit"
                  busy={busy}
                  disabled={!backendConfigured}
                >
                  {busy ? "Connecting…" : createMode ? "Create account" : "Enter Fantasia"}
                </UiButton>
                <UiButton
                  class="auth-resend"
                  tone="quiet"
                  disabled={!canResend}
                  onClick={() => onResendConfirmation(email.trim())}
                >
                  Resend confirmation email
                </UiButton>
              </form>

              <footer class="auth-panel-footer">
                <p>Email/password is the current supported account method.</p>
                <small class="auth-panel-footnote">
                  Password recovery, social login, and other account methods are not available yet.
                </small>
              </footer>
            </>
          )}
        </UiPanel>
      </section>
    </main>
  );
}
