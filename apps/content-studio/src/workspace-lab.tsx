import { render } from "preact";
import { useState } from "preact/hooks";
import { AssetBoard } from "./ui/asset-board";
import { assetBoardLabFixtures } from "./ui/asset-board.fixtures";
import { ProductionComponentInventory } from "./ui/component-inventory";
import { Button, Chip, DataTable, SelectField, Surface, TextField } from "./ui/primitives";
import { LifecycleBadge, RuntimeReadinessBadge, ValidationBadge } from "./ui/semantic";
import {
  AssetBoardTemplate,
  CollectionTemplate,
  DashboardTemplate,
  EntityWorkspaceTemplate,
  OperationalQueueTemplate,
  type StudioModuleId,
  StudioShell,
  TemplateFixtureHeading,
  TemplateToolbar,
  WorkspaceHeader,
  WorkspaceStateRegion,
} from "./ui/workspace";
import "./ui/workspace.css";
import "./ui/entity-asset.css";

const entityTabs = [
  { id: "overview", label: "Overview" },
  { id: "gameplay", label: "Gameplay" },
  { id: "skills", label: "Skills" },
  { id: "equipment", label: "Equipment" },
  { id: "assets", label: "Assets" },
  { id: "story", label: "Story" },
  { id: "relations", label: "Relations" },
  { id: "validation", label: "Validation" },
  { id: "history", label: "History" },
] as const;

function WorkspaceLab() {
  const [activeModule, setActiveModule] = useState<StudioModuleId>("characters");
  const [collapsed, setCollapsed] = useState(false);
  const [entityTab, setEntityTab] = useState("overview");
  const [entityInspectorOpen, setEntityInspectorOpen] = useState(true);

  return (
    <section class="foundation-preview" aria-labelledby="workspace-lab-title" data-testid="workspace-lab">
      <header class="foundation-preview__hero">
        <p class="foundation-preview__eyebrow">UI Lab · GAME-STUDIO00K</p>
        <h2 id="workspace-lab-title">Shared shell, production components and workspace templates</h2>
        <p>
          Development-only fixtures for the reusable Studio system. Production pages consume these
          contracts; they are not the component laboratory.
        </p>
      </header>

      <section class="preview-section" aria-labelledby="shell-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="shell-title">Global Studio shell</h2>
            <p>
              One navigation, global search/browser slot, user-role slot, and stable workspace
              viewport serve the nine frozen modules.
            </p>
          </div>
          <Chip accent>Fixture only</Chip>
        </div>
        <p class="studio-ui-lab-shell-note">
          Module buttons change fixture selection only. They do not fake routing, auth, or data.
        </p>
        <StudioShell
          activeModule={activeModule}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          onModuleSelect={setActiveModule}
          searchSlot={
            <TextField
              id="global-studio-search"
              label="Global search"
              type="search"
              placeholder="Search semantic ID, title, asset, relation…"
              hint="Interface contract only; no provider query is executed."
            />
          }
          sessionSlot={
            <Surface kind="inset">
              <strong>Studio Operator</strong>
              <p class="preview-meta">Role fixture · Editor</p>
            </Surface>
          }
        >
          <EntityWorkspaceTemplate
            tabsId="shell-character-tabs"
            tabs={entityTabs}
            selectedTab={entityTab}
            onTabSelect={setEntityTab}
            panels={{
              overview: <p>Character identity and canonical metadata fixture.</p>,
              gameplay: <WorkspaceStateRegion state="loading" />,
              skills: <WorkspaceStateRegion state="empty" />,
              equipment: <WorkspaceStateRegion state="read-only" />,
              assets: <AssetBoard assets={assetBoardLabFixtures} readOnly />,
              story: <WorkspaceStateRegion state="unauthorized" />,
              relations: <WorkspaceStateRegion state="empty" />,
              validation: <WorkspaceStateRegion state="error" />,
              history: <WorkspaceStateRegion state="empty" />,
            }}
            inspector={<p class="preview-meta">Authority and readiness remain separate.</p>}
            inspectorLabel="Character inspector"
            inspectorOpen={entityInspectorOpen}
            onInspectorOpenChange={setEntityInspectorOpen}
            header={
              <WorkspaceHeader
                breadcrumbs={["Characters", "Example entity"]}
                title="Character workspace fixture"
                description="Template composition only; this is not a production Character page."
                semanticId="character.example"
                lifecycle="approved"
                versionLabel="v003"
                sourceSummary="Git canonical definition · registry workflow metadata"
                validation="warning"
                runtimeReadiness="not-ready"
                warningCount={2}
                actionSlot={<Button variant="primary">Permission-aware action slot</Button>}
              />
            }
            toolbar={
              <TemplateToolbar>
                <Button variant="quiet">Compare</Button>
                <Button variant="quiet">History</Button>
              </TemplateToolbar>
            }
          />
        </StudioShell>
      </section>

      <section class="preview-section" aria-labelledby="components-title">
        <ProductionComponentInventory />
      </section>

      <section class="preview-section" aria-labelledby="templates-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="templates-title">Reusable template set</h2>
            <p>Five structural patterns compose the shared production components.</p>
          </div>
        </div>
        <div class="studio-template-grid">
          <CollectionTemplate
            header={<TemplateFixtureHeading title="Collection template" description="Searchable collection layout." />}
            filterSlot={<TextField id="collection-search" label="Search collection" />}
          >
            <DataTable label="Collection template fixture rows">
              <thead><tr><th scope="col">Identity</th><th scope="col">Lifecycle</th></tr></thead>
              <tbody><tr><td>entity.example</td><td><LifecycleBadge state="approved" /></td></tr></tbody>
            </DataTable>
          </CollectionTemplate>

          <DashboardTemplate header={<TemplateFixtureHeading title="Dashboard template" description="Summary composition." />}>
            <WorkspaceStateRegion state="loading" />
          </DashboardTemplate>

          <EntityWorkspaceTemplate
            tabsId="template-entity-tabs"
            tabs={entityTabs.slice(0, 4)}
            selectedTab="overview"
            onTabSelect={() => undefined}
            panels={{ overview: <p>Shared tabbed entity composition.</p> }}
            inspector={<WorkspaceStateRegion state="read-only" />}
            inspectorLabel="Entity inspector"
            inspectorOpen
            onInspectorOpenChange={() => undefined}
            header={
              <WorkspaceHeader
                breadcrumbs={["Entities", "Template"]}
                title="Entity Workspace template"
                semanticId="entity.template"
                lifecycle="frozen"
                versionLabel="v004"
                sourceSummary="Git canonical definition"
                validation="passed"
                runtimeReadiness="not-ready"
              />
            }
          />

          <AssetBoardTemplate
            header={<TemplateFixtureHeading title="Asset Board template" description="Semantic asset/version composition." />}
          >
            <AssetBoard assets={assetBoardLabFixtures} readOnly />
          </AssetBoardTemplate>

          <OperationalQueueTemplate
            header={<TemplateFixtureHeading title="Operational Queue template" description="Workflow queue composition." />}
          >
            <RuntimeReadinessBadge state="not-ready" />
          </OperationalQueueTemplate>
        </div>
      </section>

      <section class="preview-section" aria-labelledby="states-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="states-title">Template state regions</h2>
            <p>Truthful reusable presentation for common non-success states.</p>
          </div>
          <ValidationBadge state="passed" />
        </div>
        <div class="feedback-grid">
          <WorkspaceStateRegion state="loading" />
          <WorkspaceStateRegion state="empty" />
          <WorkspaceStateRegion state="error" />
          <WorkspaceStateRegion state="read-only" />
          <WorkspaceStateRegion state="unauthorized" />
        </div>
      </section>
    </section>
  );
}

const root = document.querySelector<HTMLElement>("#workspace-lab");
if (!root) throw new Error("Content Studio workspace lab root element not found");
render(<WorkspaceLab />, root);
