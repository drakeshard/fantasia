import { type JSX, useState } from "preact/hooks";
import {
  fetchStudioAuthorization,
  signInStudio,
  type StoredStudioAuthSession,
  type StudioSessionState,
} from "../studio-session";
import { PasswordField } from "../ui/PasswordField";
import { Button, Spinner, StateMessage, Surface, TextField } from "../ui/primitives";

export function StudioSessionLoading() {
  return (
    <main class="studio-auth-gate" data-testid="studio-session-loading">
      <Spinner label="Restoring Content Studio session" />
    </main>
  );
}

export function SignedOutStudio({
  onAuthorized,
}: {
  onAuthorized: (state: StudioSessionState) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: JSX.TargetedSubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const auth = await signInStudio(email, password);
      const authorization = await fetchStudioAuthorization(auth);
      if (!authorization.authorized) onAuthorized({ status: "unauthorized", auth });
      else {
        onAuthorized({
          status: "authorized",
          auth,
          authorization: { role: authorization.role, capabilities: authorization.capabilities },
        });
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setPending(false);
    }
  };

  return (
    <main class="studio-auth-gate" data-testid="studio-signed-out">
      <Surface className="studio-auth-card">
        <p class="studio-auth-eyebrow">Internal production tool</p>
        <h1>Fantasia Content Studio</h1>
        <p>
          Sign in with an authorized internal account. Player accounts do not automatically receive
          Studio access.
        </p>
        <form class="studio-auth-form" onSubmit={submit}>
          <TextField
            id="studio-auth-email"
            label="Email"
            type="email"
            value={email}
            onInput={(event) => setEmail(event.currentTarget.value)}
            autoComplete="username"
            required
          />
          <PasswordField
            id="studio-auth-password"
            label="Password"
            value={password}
            onInput={(event) => setPassword(event.currentTarget.value)}
            autoComplete="current-password"
            required
          />
          {error ? (
            <StateMessage title="Sign in failed" tone="error">
              {error}
            </StateMessage>
          ) : null}
          <Button type="submit" variant="primary" pending={pending}>
            Sign in
          </Button>
        </form>
      </Surface>
    </main>
  );
}

export function UnauthorizedStudio({
  auth,
  onSignedOut,
}: {
  auth: StoredStudioAuthSession;
  onSignedOut: () => void;
}) {
  return (
    <main class="studio-auth-gate" data-testid="studio-unauthorized">
      <Surface className="studio-auth-card">
        <p class="studio-auth-eyebrow">Authenticated · access not granted</p>
        <h1>Studio membership required</h1>
        <p>
          {auth.email ?? "This authenticated user"} has no active Fantasia Content Studio
          membership. Authentication alone is not Studio authorization.
        </p>
        <Button onClick={onSignedOut}>Sign out</Button>
      </Surface>
    </main>
  );
}

export function StudioSessionError({
  message,
  onReturnToSignIn,
}: {
  message: string;
  onReturnToSignIn: () => void;
}) {
  return (
    <main class="studio-auth-gate" data-testid="studio-session-error">
      <Surface className="studio-auth-card">
        <StateMessage title="Studio session unavailable" tone="error">
          {message}
        </StateMessage>
        <Button onClick={onReturnToSignIn}>Return to sign in</Button>
      </Surface>
    </main>
  );
}
