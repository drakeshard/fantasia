import type { JSX } from "preact";
import type { StudioReadModelsResponse } from "../dashboard-model";
import { ProductionCharacters } from "../features/characters";
import { ProductionDashboard } from "../production-dashboard";
import type { StoredStudioAuthSession } from "../studio-session";
import { Spinner, StateMessage } from "../ui/primitives";
import { DashboardTemplate, type StudioModuleId, TemplateFixtureHeading } from "../ui/workspace";
import type { StudioReadModelState } from "./use-studio-read-models";

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

function withReadModel(
  state: StudioReadModelState,
  label: string,
  renderReady: (response: StudioReadModelsResponse) => JSX.Element,
): JSX.Element {
  if (state.status === "loading") return <ReadModelLoading label={label} />;
  if (state.status === "error") return <ReadModelError label={label} message={state.message} />;
  return renderReady(state.response);
}

export function ProductionWorkspace({
  activeModule,
  activeSemanticId,
  readModels,
  auth,
  isReadOnly,
  canProposeCanonical,
  navigate,
}: {
  activeModule: StudioModuleId;
  activeSemanticId: string | null;
  readModels: StudioReadModelState;
  auth: StoredStudioAuthSession;
  isReadOnly: boolean;
  canProposeCanonical: boolean;
  navigate: (module: StudioModuleId, semanticId?: string | null) => void;
}) {
  if (activeModule === "dashboard") {
    return withReadModel(readModels, "Production Dashboard", (response) => (
      <ProductionDashboard response={response} readOnly={isReadOnly} onNavigate={navigate} />
    ));
  }

  if (activeModule === "characters") {
    return withReadModel(readModels, "Characters", (response) => (
      <ProductionCharacters
        response={response}
        auth={auth}
        canPropose={canProposeCanonical}
        semanticId={activeSemanticId}
        onSemanticIdChange={(semanticId) => navigate("characters", semanticId)}
      />
    ));
  }

  return (
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
        {activeModule} production authoring is intentionally unavailable before its focused issue.
      </StateMessage>
    </DashboardTemplate>
  );
}
