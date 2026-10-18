import { type JSX, render } from "preact";
import { useEffect, useState } from "preact/hooks";
import "./styles/tokens.css";
import "./styles/base.css";
import "./ui/primitives.css";
import "./ui/semantic.css";
import "./ui/workspace.css";
import "./styles/material-fidelity.css";
import "./styles/studio-auth.css";
import {
  fetchStudioAuthorization,
  restoreStudioSession,
  type StoredStudioAuthSession,
  type StudioSessionState,
  signInStudio,
  signOutStudio,
} from "./studio-session";
import { PasswordField } from "./ui/PasswordField";
import { Button, Spinner, StateMessage, Surface, TextField } from "./ui/primitives";
import {
  DashboardTemplate,
  type StudioModuleId,
  StudioShell,
  TemplateFixtureHeading,
} from "./ui/workspace";

function SignedOut({ onAuthorized }: { onAuthorized: (state: StudioSessionState) => void }) {
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
      if (!authorization.authorized) {
        onAuthorized({ status: "unauthorized", auth });
      } else {
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

function Unauthorized({
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

function AuthorizedStudio({
  state,
  onSignedOut,
}: {
  state: Extract<StudioSessionState, { status: "authorized" }>;
  onSignedOut: () => void;
}) {
  const [activeModule, setActiveModule] = useState<StudioModuleId>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const { authorization, auth } = state;
  const isReadOnly = !authorization.capabilities.includes("registry.metadata.edit");

  return (
    <main class="studio-production-root" data-testid="studio-authorized">
      <StudioShell
        activeModule={activeModule}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        onModuleSelect={setActiveModule}
        showFixtureNote={false}
        searchSlot={
          <TextField
            id="production-studio-search"
            label="Global search"
            type="search"
            placeholder="Search becomes available with STUDIO03"
            disabled
          />
        }
        sessionSlot={
          <Surface kind="inset" className="studio-session-card">
            <strong>{auth.email ?? "Studio member"}</strong>
            <span>{authorization.role}</span>
            <small>{isReadOnly ? "Read-only capabilities" : "Trusted operations enabled"}</small>
            <Button variant="quiet" onClick={onSignedOut}>
              Sign out
            </Button>
          </Surface>
        }
      >
        <DashboardTemplate
          header={
            <TemplateFixtureHeading
              title={activeModule === "dashboard" ? "Dashboard" : "Module not implemented yet"}
              description={
                activeModule === "dashboard"
                  ? "Authenticated production shell. Real operational read models arrive in STUDIO03/STUDIO05."
                  : "The shared authenticated shell is live; this production workspace remains intentionally unavailable until its focused issue."
              }
            />
          }
        >
          {isReadOnly ? (
            <StateMessage title="Read-only access" tone="unavailable">
              Your Viewer membership can inspect authorized Studio data. Privileged mutation actions
              are not exposed.
            </StateMessage>
          ) : (
            <StateMessage title="Workspace data not connected yet">
              Authentication and trusted operations are active. Production read models arrive in
              STUDIO03 and focused module issues.
            </StateMessage>
          )}
        </DashboardTemplate>
      </StudioShell>
    </main>
  );
}

function ProductionStudio() {
  const [state, setState] = useState<StudioSessionState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    void restoreStudioSession().then((restored) => {
      if (active) setState(restored);
    });
    return () => {
      active = false;
    };
  }, []);

  const signOut = async () => {
    const auth =
      state.status === "authorized" || state.status === "unauthorized" ? state.auth : null;
    await signOutStudio(auth);
    setState({ status: "signed-out" });
  };

  if (state.status === "loading") {
    return (
      <main class="studio-auth-gate" data-testid="studio-session-loading">
        <Spinner label="Restoring Content Studio session" />
      </main>
    );
  }
  if (state.status === "signed-out") return <SignedOut onAuthorized={setState} />;
  if (state.status === "unauthorized") {
    return <Unauthorized auth={state.auth} onSignedOut={() => void signOut()} />;
  }
  if (state.status === "error") {
    return (
      <main class="studio-auth-gate" data-testid="studio-session-error">
        <Surface className="studio-auth-card">
          <StateMessage title="Studio session unavailable" tone="error">
            {state.message}
          </StateMessage>
          <Button onClick={() => setState({ status: "signed-out" })}>Return to sign in</Button>
        </Surface>
      </main>
    );
  }
  return <AuthorizedStudio state={state} onSignedOut={() => void signOut()} />;
}

const labMode = new URLSearchParams(window.location.search).get("lab") === "1";
const root = document.querySelector<HTMLElement>("#studio-app");
if (!root) throw new Error("Content Studio production root element not found");
if (!labMode) render(<ProductionStudio />, root);
