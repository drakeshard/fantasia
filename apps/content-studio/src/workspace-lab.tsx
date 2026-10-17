import { render } from "preact";
import { useState } from "preact/hooks";
import "./ui/workspace.css";
import { Button, Chip, DataTable, SelectField, Surface, TextField } from "./ui/primitives";
import {
  LifecycleBadge,
  RuntimeReadinessBadge,
  ValidationBadge,
  VersionBadge,
} from "./ui/semantic";
import {
  AssetBoardTemplate,
  AuthoritySummary,
  CollectionTemplate,
  DashboardTemplate,
  EntityWorkspaceTemplate,
  OperationalQueueTemplate,
  StudioShell,
  TemplateFixtureHeading,
  TemplateToolbar,
  WorkspaceHeader,
  WorkspaceStateRegion,
  type StudioModuleId,
} from "./ui/workspace";

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

function FixtureCard({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <article class="studio-fixture-card">
      <strong>{title}</strong>
      <p>{children}</p>
    </article>
  );
}

function WorkspaceLab() {
  const [activeModule, setActiveModule] = useState<StudioModuleId>("characters");
  const [collapsed, setCollapsed] = useState(false);
  const [entityTab, setEntityTab] = useState("overview");
  const [entityInspectorOpen, setEntityInspectorOpen] = useState(true);
  const [assetInspectorOpen, setAssetInspectorOpen] = useState(true);

  return (
    <section class="foundation-preview" aria-labelledby="workspace-lab-title" data-testid="workspace-lab">
      <header class="foundation-preview__hero">
        <p class="foundation-preview__eyebrow">UI Lab · GAME-STUDIO00D</p>
        <h2 id="workspace-lab-title">Shared shell and workspace templates</h2>
        <p>
          Development-only fixture surface for the frozen Layer 3A shell and reusable workspace
          patterns. It contains no production routes, auth enforcement, provider calls, registry
          mutations, or canonical content edits.
        </p>
      </header>

      <section class="preview-section" aria-labelledby="shell-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="shell-title">Global Studio shell</h2>
            <p>
              The nine frozen modules share one navigation, global search/browser slot, user-role
              presentation slot, and stable workspace viewport.
            </p>
          </div>
          <Chip accent>Fixture only</Chip>
        </div>
        <p class="studio-ui-lab-shell-note">
          Module buttons intentionally change selection only. They do not fake routing or data.
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
              overview: (
                <div class="studio-fixture-card-grid">
                  <FixtureCard title="Identity">Character identity and canonical metadata slot.</FixtureCard>
                  <FixtureCard title="Gameplay">Class, faction, element and stat summary slot.</FixtureCard>
                  <FixtureCard title="Relations">Explicit semantic relations remain separately visible.</FixtureCard>
                </div>
              ),
              gameplay: <WorkspaceStateRegion state="loading" />,
              skills: <WorkspaceStateRegion state="empty" />,
              equipment: <WorkspaceStateRegion state="read-only" />,
              assets: <WorkspaceStateRegion state="empty" />,
              story: <WorkspaceStateRegion state="unauthorized" />,
              relations: <WorkspaceStateRegion state="empty" />,
              validation: <WorkspaceStateRegion state="error" />,
              history: <WorkspaceStateRegion state="empty" />,
            }}
            inspector={
              <>
                <AuthoritySummary validation="warning" runtimeReadiness="not-ready" />
                <p class="preview-meta">
                  Inspector fixture keeps source authority and readiness visible without exposing
                  fake mutations.
                </p>
              </>
            }
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

      <section class="preview-section" aria-labelledby="templates-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="templates-title">Reusable template set</h2>
            <p>
              Five structural templates provide typed composition regions while canonical data stays
              in its real authority.
            </p>
          </div>
        </div>

        <div class="studio-template-grid">
          <CollectionTemplate
            header={
              <TemplateFixtureHeading
                title="Collection template"
                description="Searchable/filterable entity or asset collection layout."
                status={<ValidationBadge state="passed" />}
              />
            }
            toolbar={
              <TemplateToolbar>
                <Button variant="quiet">Saved view</Button>
                <Button variant="quiet">Columns</Button>
              </TemplateToolbar>
            }
            filterSlot={
              <>
                <TextField id="collection-search" label="Search collection" placeholder="Semantic ID or title" />
                <SelectField
                  id="collection-filter"
                  label="Lifecycle filter"
                  defaultValue="all"
                  options={[
                    { value: "all", label: "All lifecycle states" },
                    { value: "approved", label: "Approved" },
                  ]}
                />
              </>
            }
          >
            <DataTable label="Collection template fixture rows">
              <thead>
                <tr>
                  <th scope="col">Identity</th>
                  <th scope="col">Lifecycle</th>
                  <th scope="col">Validation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>entity.example-a</td>
                  <td><LifecycleBadge state="approved" /></td>
                  <td><ValidationBadge state="passed" /></td>
                </tr>
                <tr>
                  <td>entity.example-b</td>
                  <td><LifecycleBadge state="in-review" /></td>
                  <td><ValidationBadge state="warning" /></td>
                </tr>
              </tbody>
            </DataTable>
          </CollectionTemplate>

          <DashboardTemplate
            header={
              <TemplateFixtureHeading
                title="Dashboard template"
                description="Attention, summary and navigation panels without invented production metrics."
              />
            }
          >
            <div class="studio-fixture-metric-grid">
              <article class="studio-fixture-metric">
                <span>Attention slot</span>
                <strong>—</strong>
                <p>Real metric awaits an authoritative read model.</p>
              </article>
              <article class="studio-fixture-metric">
                <span>Review slot</span>
                <strong>—</strong>
                <p>No fake queue count is presented.</p>
              </article>
              <article class="studio-fixture-metric">
                <span>Release slot</span>
                <strong>—</strong>
                <p>Publishing state belongs to Layer 5 contracts.</p>
              </article>
            </div>
            <WorkspaceStateRegion state="loading" />
          </DashboardTemplate>

          <EntityWorkspaceTemplate
            tabsId="template-entity-tabs"
            tabs={entityTabs.slice(0, 4)}
            selectedTab="overview"
            onTabSelect={() => undefined}
            panels={{
              overview: (
                <div class="studio-fixture-card-grid">
                  <FixtureCard title="Main content">Shared tabbed entity composition.</FixtureCard>
                  <FixtureCard title="Independent semantics">Lifecycle and readiness never collapse.</FixtureCard>
                </div>
              ),
            }}
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
            header={
              <WorkspaceHeader
                breadcrumbs={["Characters", "Template", "Assets"]}
                title="Asset Board template"
                description="Semantic asset/version groups with retained source and derivative separation."
                semanticId="asset.entity.template"
                lifecycle="approved"
                versionLabel="v003"
                sourceSummary="Drive source/master · registry metadata"
                validation="warning"
                runtimeReadiness="not-ready"
                warningCount={1}
              />
            }
            toolbar={
              <TemplateToolbar>
                <Button variant="quiet">Role group</Button>
                <Button variant="quiet">Variant group</Button>
              </TemplateToolbar>
            }
            inspector={
              <>
                <VersionBadge label="v003" current />
                <ValidationBadge state="warning" />
                <RuntimeReadinessBadge state="not-ready" />
                <p class="preview-meta">Provider location is metadata, not semantic identity.</p>
              </>
            }
            inspectorLabel="Asset version inspector"
            inspectorOpen={assetInspectorOpen}
            onInspectorOpenChange={setAssetInspectorOpen}
          >
            <div class="studio-fixture-assets">
              <article class="studio-fixture-asset">
                <strong>Portrait · base</strong>
                <LifecycleBadge state="approved" />
                <p>Source/master v003 · derivative readiness shown separately.</p>
              </article>
              <article class="studio-fixture-asset">
                <strong>Battle sprite · base</strong>
                <LifecycleBadge state="in-review" />
                <p>Replacement would create another retained version.</p>
              </article>
              <article class="studio-fixture-asset">
                <strong>Signature equipment relation</strong>
                <ValidationBadge state="passed" />
                <p>Related entity, not duplicated character-owned art.</p>
              </article>
            </div>
          </AssetBoardTemplate>

          <OperationalQueueTemplate
            header={
              <TemplateFixtureHeading
                title="Operational Queue template"
                description="Shared review, processing, publish or verification queue structure."
                status={<Chip>Presentation only</Chip>}
              />
            }
          >
            <div class="studio-fixture-queue">
              <article class="studio-fixture-queue-item">
                <div>
                  <strong>Version-specific review item</strong>
                  <p>Workflow metadata is layered over lifecycle.</p>
                </div>
                <LifecycleBadge state="in-review" />
              </article>
              <article class="studio-fixture-queue-item">
                <div>
                  <strong>Runtime processing item</strong>
                  <p>Processing status does not rewrite source approval.</p>
                </div>
                <RuntimeReadinessBadge state="not-ready" />
              </article>
              <article class="studio-fixture-queue-item">
                <div>
                  <strong>Verification item</strong>
                  <p>Post-publish evidence remains a separate dimension.</p>
                </div>
                <ValidationBadge state="warning" />
              </article>
            </div>
          </OperationalQueueTemplate>
        </div>
      </section>

      <section class="preview-section" aria-labelledby="states-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="states-title">Template state regions</h2>
            <p>Truthful reusable presentation for common non-success states.</p>
          </div>
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
