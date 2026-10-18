import { useEffect, useState } from "preact/hooks";
import type { StudioSessionState } from "../studio-session";
import { Button, Surface, TextField } from "../ui/primitives";
import { type StudioModuleId, StudioShell } from "../ui/workspace";
import { ProductionWorkspace } from "./ProductionWorkspace";
import { pushStudioRoute, studioRouteFromLocation } from "./studio-routing";
import { useStudioReadModels } from "./use-studio-read-models";

export function AuthorizedStudio({
  state,
  onSignedOut,
}: {
  state: Extract<StudioSessionState, { status: "authorized" }>;
  onSignedOut: () => void;
}) {
  const initialRoute = studioRouteFromLocation();
  const [activeModule, setActiveModule] = useState<StudioModuleId>(initialRoute.module);
  const [activeSemanticId, setActiveSemanticId] = useState<string | null>(initialRoute.semanticId);
  const [collapsed, setCollapsed] = useState(false);
  const { authorization, auth } = state;
  const { state: readModels, refresh: refreshReadModels } = useStudioReadModels(auth);
  const isReadOnly = !authorization.capabilities.includes("registry.metadata.edit");
  const canProposeCanonical = authorization.capabilities.includes("canonical.change.propose");
  const canManageMembership = authorization.capabilities.includes("studio.membership.manage");

  useEffect(() => {
    document
      .querySelector<HTMLElement>(".studio-production-root .studio-shell__fixture-note")
      ?.remove();
    const popState = () => {
      const route = studioRouteFromLocation();
      setActiveModule(route.module);
      setActiveSemanticId(route.semanticId);
    };
    window.addEventListener("popstate", popState);
    return () => window.removeEventListener("popstate", popState);
  }, []);

  const navigate = (module: StudioModuleId, semanticId: string | null = null) => {
    setActiveModule(module);
    setActiveSemanticId(semanticId);
    pushStudioRoute({ module, semanticId });
  };

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
        <ProductionWorkspace
          activeModule={activeModule}
          activeSemanticId={activeSemanticId}
          readModels={readModels}
          auth={auth}
          isReadOnly={isReadOnly}
          canProposeCanonical={canProposeCanonical}
          canManageMembership={canManageMembership}
          onRefreshReadModels={refreshReadModels}
          navigate={navigate}
        />
      </StudioShell>
    </main>
  );
}
