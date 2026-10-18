import { type JSX, render } from "preact";
import { useEffect, useState } from "preact/hooks";
import "./styles/tokens.css";
import "./styles/base.css";
import "./ui/primitives.css";
import "./ui/semantic.css";
import "./ui/workspace.css";
import "./styles/material-fidelity.css";
import "./styles/studio-auth.css";
import "./styles/production-dashboard.css";
import "./styles/production-characters.css";
import type { StudioReadModelsResponse } from "./dashboard-model";
import { ProductionCharacters } from "./production-characters";
import { ProductionDashboard } from "./production-dashboard";
import {
  fetchStudioAuthorization,
  fetchStudioReadModels,
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
  studioModules,
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
      if (!authorization.authorized) onAuthorized({ status: "unauthorized", auth });
      else
        onAuthorized({
          status: "authorized",
          auth,
          authorization: { role: authorization.role, capabilities: authorization.capabilities },
        });
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

function moduleFromUrl(): StudioModuleId {
  const requested = new URLSearchParams(window.location.search).get("module");
  return studioModules.some((module) => module.id === requested)
    ? (requested as StudioModuleId)
    : "dashboard";
}

function semanticIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("semanticId");
}

function replaceWorkspaceUrl(module: StudioModuleId, semanticId: string | null): void {
  const params = new URLSearchParams(window.location.search);
  params.delete("lab");
  if (module === "dashboard" && !semanticId) params.delete("module");
  else params.set("module", module);
  if (semanticId) params.set("semanticId", semanticId);
  else params.delete("semanticId");
  const query = params.toString();
  window.history.pushState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}

type DashboardLoadState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly response: StudioReadModelsResponse }
  | { readonly status: "error"; readonly message: string };

function ReadModelLoading({ label }: { label: string }) {
  return (
    <DashboardTemplate
      header={
        <TemplateFixtureHeading
          title={label}
          description="Loading normalized production read models."
        />
      }
    >
      <div class="studio-template-state" data-state="loading">
        <Spinner label={`Loading ${label}`} />
        <div>
          <strong>Loading authoritative state</strong>
          <span>Git canonical facts and registry metadata are being composed.</span>
        </div>
      </div>
    </DashboardTemplate>
  );
}

function ReadModelError({ label, message }: { label: string; message: string }) {
  return (
    <DashboardTemplate
      header={
        <TemplateFixtureHeading title={label} description="Production read model failed to load." />
      }
    >
      <StateMessage title={`${label} read failed`} tone="error">
        {message} Authoritative source data was not changed.
      </StateMessage>
    </DashboardTemplate>
  );
}

function AuthorizedStudio({
  state,
  onSignedOut,
}: {
  state: Extract<StudioSessionState, { status: "authorized" }>;
  onSignedOut: () => void;
}) {
  const [activeModule, setActiveModule] = useState<StudioModuleId>(moduleFromUrl);
  const [activeSemanticId, setActiveSemanticId] = useState<string | null>(semanticIdFromUrl);
  const [collapsed, setCollapsed] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardLoadState>({ status: "loading" });
  const { authorization, auth } = state;
  const isReadOnly = !authorization.capabilities.includes("registry.metadata.edit");
  const canProposeCanonical = authorization.capabilities.includes("canonical.change.propose");

  useEffect(() => {
    document
      .querySelector<HTMLElement>(".studio-production-root .studio-shell__fixture-note")
      ?.remove();
    let active = true;
    void fetchStudioReadModels(auth)
      .then((response) => {
        if (active) setDashboard({ status: "ready", response });
      })
      .catch((error) => {
        if (active)
          setDashboard({
            status: "error",
            message: error instanceof Error ? error.message : "Studio read failed.",
          });
      });
    const popState = () => {
      setActiveModule(moduleFromUrl());
      setActiveSemanticId(semanticIdFromUrl());
    };
    window.addEventListener("popstate", popState);
    return () => {
      active = false;
      window.removeEventListener("popstate", popState);
    };
  }, [auth]);

  const navigate = (module: StudioModuleId, semanticId: string | null = null) => {
    setActiveModule(module);
    setActiveSemanticId(semanticId);
    replaceWorkspaceUrl(module, semanticId);
  };

  let workspace: JSX.Element;
  if (activeModule === "dashboard") {
    workspace =
      dashboard.status === "loading" ? (
        <ReadModelLoading label="Production Dashboard" />
      ) : dashboard.status === "error" ? (
        <ReadModelError label="Production Dashboard" message={dashboard.message} />
      ) : (
        <ProductionDashboard
          response={dashboard.response}
          readOnly={isReadOnly}
          onNavigate={navigate}
        />
      );
  } else if (activeModule === "characters") {
    workspace =
      dashboard.status === "loading" ? (
        <ReadModelLoading label="Characters" />
      ) : dashboard.status === "error" ? (
        <ReadModelError label="Characters" message={dashboard.message} />
      ) : (
        <ProductionCharacters
          response={dashboard.response}
          auth={auth}
          canPropose={canProposeCanonical}
          semanticId={activeSemanticId}
          onSemanticIdChange={(semanticId) => navigate("characters", semanticId)}
        />
      );
  } else {
    workspace = (
      <DashboardTemplate
        header={
          <TemplateFixtureHeading
            title="Module not implemented yet"
            description="The deep link preserved this stable context; the focused production workspace is delivered by its own issue."
          />
        }
      >
        <StateMessage title="Context preserved" tone="unavailable">
          {activeSemanticId ? `Semantic ID: ${activeSemanticId}. ` : ""}
          {activeModule} production authoring is intentionally unavailable in STUDIO06.
        </StateMessage>
      </DashboardTemplate>
    );
  }

  return (
    <main class="studio-production-root" data-testid="studio-authorized">
      <StudioShell
        activeModule={activeModule}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        onModuleSelect={(module) => navigate(module)}
        searchSlot={
          <TextField
            id="production-studio-search"
            label="Global search"
            type="search"
            placeholder="Use the active module filter"
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
        {workspace}
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

  if (state.status === "loading")
    return (
      <main class="studio-auth-gate" data-testid="studio-session-loading">
        <Spinner label="Restoring Content Studio session" />
      </main>
    );
  if (state.status === "signed-out") return <SignedOut onAuthorized={setState} />;
  if (state.status === "unauthorized")
    return <Unauthorized auth={state.auth} onSignedOut={() => void signOut()} />;
  if (state.status === "error")
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
  return <AuthorizedStudio state={state} onSignedOut={() => void signOut()} />;
}

const labMode = new URLSearchParams(window.location.search).get("lab") === "1";
const root = document.querySelector<HTMLElement>("#studio-app");
if (!root) throw new Error("Content Studio production root element not found");
if (!labMode) render(<ProductionStudio />, root);
