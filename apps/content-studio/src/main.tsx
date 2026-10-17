import { render } from "preact";
import { useState } from "preact/hooks";
import "./styles/tokens.css";
import "./styles/base.css";
import "./ui/primitives.css";
import "./ui/semantic.css";
import "./styles/foundation-preview.css";
import {
  ActionGroup,
  Button,
  Checkbox,
  Chip,
  DataTable,
  Dialog,
  Divider,
  IconButton,
  ProgressBar,
  SectionHeading,
  SelectField,
  Spinner,
  StateMessage,
  Surface,
  TabPanel,
  Tabs,
  TextArea,
  TextField,
  Toolbar,
} from "./ui/primitives";
import {
  LifecycleBadge,
  LifecycleProgress,
  ProvenanceSummary,
  ProviderReference,
  ReadinessSummary,
  RelationCard,
  ReviewBadge,
  ReviewSummary,
  RuntimeDerivativeCard,
  SemanticDimensionGrid,
  SemanticFixture,
  ValidationBadge,
  VersionHistoryItem,
} from "./ui/semantic";
import { lifecycleOrder } from "./ui/semantic-model";

const tabs = [
  { id: "overview", label: "Overview", disabled: false },
  { id: "assets", label: "Assets", disabled: false },
  { id: "history", label: "History", disabled: false },
  { id: "future", label: "Unavailable", disabled: true },
] as const;

function App() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [commitCount, setCommitCount] = useState(0);

  const simulateCommit = () => {
    if (pending) return;
    setPending(true);
    setCommitCount((count) => count + 1);
    window.setTimeout(() => setPending(false), 450);
  };

  return (
    <main class="foundation-preview" aria-labelledby="studio-title">
      <header class="foundation-preview__hero">
        <p class="foundation-preview__eyebrow">UI Lab · GAME-STUDIO00C</p>
        <h1 id="studio-title">Fantasia Content Studio</h1>
        <p>
          Shared Studio semantics layered over the 00A token system and 00B primitives. Lifecycle,
          review, validation, runtime readiness, publication and verification remain independently
          visible.
        </p>
      </header>

      <section class="preview-section" aria-labelledby="semantic-lifecycle-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="semantic-lifecycle-title">Lifecycle vocabulary</h2>
            <p>
              One exact lifecycle sequence is reused everywhere. Review and readiness never create
              alternate lifecycle states.
            </p>
          </div>
          <LifecycleBadge state="approved" />
        </div>
        <LifecycleProgress state="approved" versionLabel="asset v003" />
        <p class="preview-meta preview-meta--spaced">Exact reusable lifecycle badge set</p>
        <div class="semantic-grid" data-testid="lifecycle-badge-set">
          {lifecycleOrder.map((state) => (
            <LifecycleBadge state={state} key={state} />
          ))}
        </div>
      </section>

      <section class="preview-section" aria-labelledby="mixed-state-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="mixed-state-title">Independent semantic dimensions</h2>
            <p>
              Mixed fixtures prove lifecycle, validation, review, runtime, publication and
              verification can coexist without being collapsed.
            </p>
          </div>
        </div>
        <div class="studio-semantic-fixture-grid">
          <SemanticFixture
            title="Approved with validation warning"
            description="Content approval does not erase technical warnings."
            testId="fixture-approved-warning"
          >
            <SemanticDimensionGrid
              lifecycle="approved"
              validation="warning"
              review="approved"
              runtimeReadiness="not-ready"
              publication="unpublished"
              verification="unverified"
            />
          </SemanticFixture>

          <SemanticFixture
            title="Frozen but runtime not ready"
            description="Freeze and runtime readiness remain separate gates."
            testId="fixture-frozen-runtime-not-ready"
          >
            <SemanticDimensionGrid
              lifecycle="frozen"
              validation="passed"
              review="approved"
              runtimeReadiness="not-ready"
              publication="unpublished"
              verification="unverified"
            />
          </SemanticFixture>

          <SemanticFixture
            title="Runtime ready, not published"
            description="Readiness can be satisfied before publication."
            testId="fixture-runtime-ready-unpublished"
          >
            <SemanticDimensionGrid
              lifecycle="runtime-ready"
              validation="passed"
              review="approved"
              runtimeReadiness="ready"
              publication="unpublished"
              verification="unverified"
            />
          </SemanticFixture>

          <SemanticFixture
            title="Published with verification warning"
            description="Post-publish warning does not rewrite lifecycle history."
            testId="fixture-published-verification-warning"
          >
            <SemanticDimensionGrid
              lifecycle="published"
              validation="passed"
              review="approved"
              runtimeReadiness="ready"
              publication="published"
              verification="warning"
            />
          </SemanticFixture>
        </div>
      </section>

      <section class="preview-section" aria-labelledby="review-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="review-title">Review, approval and readiness</h2>
            <p>
              Review presentation is explicitly version-scoped and permission-aware only at the UI
              level; no privileged mutation exists here.
            </p>
          </div>
        </div>
        <div class="studio-semantic-fixture-grid">
          <ReviewSummary
            versionLabel="character.jeanne.base / v003"
            state="requested"
            assignee="Art approver"
            commentCount={3}
            changeRequestCount={0}
            approvalEligible
            freezeEligible={false}
          />
          <ReviewSummary
            versionLabel="character.jeanne.base / v002"
            state="changes-requested"
            assignee="Asset owner"
            commentCount={7}
            changeRequestCount={2}
            approvalEligible={false}
            freezeEligible={false}
          />
          <ReviewSummary
            versionLabel="character.jeanne.base / v003"
            state="approved"
            assignee="Delegated approver"
            commentCount={4}
            changeRequestCount={0}
            approvalEligible
            freezeEligible
          />
          <Surface kind="inset">
            <SectionHeading
              title="Readiness dimensions"
              description="Visual/content validation is not runtime readiness."
            />
            <ReadinessSummary
              contentValidation="warning"
              runtimeReadiness="not-ready"
              blockingCount={0}
              warningCount={2}
            />
          </Surface>
        </div>
      </section>

      <section class="preview-section" aria-labelledby="versions-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="versions-title">Versions and retained history</h2>
            <p>
              Replacement creates a new version. Older reviewed versions remain readable instead of
              looking overwritten.
            </p>
          </div>
        </div>
        <ul class="studio-version-list" aria-label="Asset version history">
          <VersionHistoryItem
            label="v003"
            current
            lifecycle="approved"
            createdAt="Current version · 17 Oct 2026"
            summary="Corrected sword geometry; review and provenance apply specifically to v003."
          />
          <VersionHistoryItem
            label="v002"
            current={false}
            lifecycle="frozen"
            createdAt="Historical version · 16 Oct 2026"
            summary="Previously frozen source retained for audit and rollback evidence."
          />
          <VersionHistoryItem
            label="v001"
            current={false}
            lifecycle="retired"
            createdAt="Historical version · 14 Oct 2026"
            summary="Superseded source remains in version history rather than being erased."
          />
        </ul>
      </section>

      <section class="preview-section" aria-labelledby="source-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="source-title">Semantic identity, providers and provenance</h2>
            <p>
              Semantic IDs are primary. Provider paths are secondary metadata and may change without
              redefining the content identity.
            </p>
          </div>
        </div>
        <div class="studio-provider-stack">
          <ProviderReference
            semanticId="character.jeanne"
            provider="git"
            reference="content/characters/jeanne.json"
            sourceRole="canonical-definition"
          />
          <ProviderReference
            semanticId="asset.character.jeanne.base"
            provider="drive"
            reference="Drive file 1wOm8… / source-master/v003"
            sourceRole="source-master"
          />
          <ProviderReference
            semanticId="asset.character.jeanne.base"
            provider="registry"
            reference="asset_versions / v003"
            sourceRole="registry-metadata"
          />
          <ProviderReference
            semanticId="asset.character.jeanne.base.runtime"
            provider="runtime"
            reference="runtime-assets/characters/jeanne/base-v003.webp"
            sourceRole="runtime-derivative"
          />
        </div>
        <Divider />
        <ProvenanceSummary
          semanticId="asset.character.jeanne.base"
          sourceVersion="v003"
          provider="drive"
          sourceReference="Drive file 1wOm8… / source-master/v003"
          checksum="sha256:7c1f…9b42"
          processingProfile="portrait-web-v1"
        />
      </section>

      <section class="preview-section" aria-labelledby="relations-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="relations-title">Relations and usage</h2>
            <p>
              Cross-entity links show ownership direction without copying the related asset into a
              second identity.
            </p>
          </div>
        </div>
        <div class="studio-relations-grid">
          <RelationCard
            relationType="Signature equipment"
            sourceId="character.jeanne"
            targetId="equipment.lys-de-laube"
            targetLabel="Lys de l’Aube"
            note="Relationship only; equipment retains its own canonical identity and assets."
          />
          <RelationCard
            relationType="Story appearance"
            sourceId="character.jeanne"
            targetId="story.s01.ch02.tourelles"
            targetLabel="The Tourelles"
            note="Usage reference links the character to story content without duplicating either record."
          />
        </div>
      </section>

      <section class="preview-section" aria-labelledby="runtime-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="runtime-title">Runtime derivatives and release state</h2>
            <p>
              Every derivative names its source version. Runtime readiness, publication and
              verification are presented as separate facts.
            </p>
          </div>
        </div>
        <div class="studio-runtime-grid">
          <RuntimeDerivativeCard
            derivativeId="asset.character.jeanne.base.runtime-web"
            sourceVersion="v003"
            runtimeReadiness="ready"
            publication="unpublished"
            verification="unverified"
            checksum="sha256:3e1a…c109"
            providerReference="runtime-assets/characters/jeanne/base-v003.webp"
          />
          <RuntimeDerivativeCard
            derivativeId="asset.character.jeanne.base.runtime-web@published"
            sourceVersion="v002"
            runtimeReadiness="ready"
            publication="published"
            verification="warning"
            checksum="sha256:b28d…71e0"
            providerReference="runtime-assets/characters/jeanne/base-v002.webp"
          />
        </div>
      </section>

      <section class="preview-section" aria-labelledby="review-state-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="review-state-title">Review workflow presentation</h2>
            <p>
              Requested, changes requested and approved are workflow states, not lifecycle aliases.
            </p>
          </div>
        </div>
        <div class="semantic-grid">
          <ReviewBadge state="requested" />
          <ReviewBadge state="changes-requested" />
          <ReviewBadge state="approved" />
          <ValidationBadge state="passed" />
          <ValidationBadge state="warning" />
          <ValidationBadge state="blocking" />
          <ValidationBadge state="unknown" />
        </div>
      </section>

      <section class="preview-section" aria-labelledby="actions-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="actions-title">00B primitive regression surface</h2>
            <p>Base actions and pending guards remain available under the semantic layer.</p>
          </div>
          <Chip accent>44px minimum target</Chip>
        </div>
        <div class="preview-stack">
          <ActionGroup>
            <Button variant="primary">Primary action</Button>
            <Button>Secondary action</Button>
            <Button variant="quiet">Quiet action</Button>
            <Button disabled>Disabled</Button>
            <Button pending>Pending</Button>
            <IconButton label="Add item" icon="+" />
          </ActionGroup>
          <Surface kind="inset">
            <SectionHeading
              title="Pending commitment guard"
              description="The button disables while the simulated asynchronous action is pending."
              actions={
                <Button
                  variant="primary"
                  pending={pending}
                  onClick={simulateCommit}
                  data-testid="async-action"
                >
                  Simulate commit
                </Button>
              }
            />
            <p class="preview-meta" data-testid="commit-count">
              Accepted commitments: {commitCount}
            </p>
          </Surface>
        </div>
      </section>

      <section class="preview-section" aria-labelledby="forms-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="forms-title">00B form regression surface</h2>
            <p>Native labels, descriptions, invalid state and disabled behavior remain intact.</p>
          </div>
        </div>
        <div class="form-grid">
          <TextField
            id="studio-search"
            type="search"
            label="Search"
            placeholder="Search semantic ID or title"
            hint="Search remains presentation-only in this UI Lab."
          />
          <TextField
            id="studio-invalid"
            label="Required reference"
            defaultValue="unknown/ref"
            error="This reference is unavailable."
            required
          />
          <SelectField
            id="studio-choice"
            label="Display density"
            defaultValue="comfortable"
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" },
            ]}
          />
          <Checkbox
            id="studio-selection"
            label="Select this row"
            description="Generic selection primitive for later workspace composition."
          />
          <div class="form-grid__wide">
            <TextArea
              id="studio-notes"
              label="Notes"
              placeholder="Reusable multiline input"
              hint="This lab does not persist entered values."
            />
          </div>
        </div>
      </section>

      <section class="preview-section" aria-labelledby="navigation-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="navigation-title">00B tabs and keyboard regression</h2>
            <p>Arrow keys, Home and End move selection while focus remains visibly distinct.</p>
          </div>
        </div>
        <Tabs
          id="foundation-tabs"
          label="Primitive preview sections"
          tabs={tabs}
          selectedId={selectedTab}
          onSelect={setSelectedTab}
        />
        {tabs.map((tab) => (
          <TabPanel
            tabsId="foundation-tabs"
            tabId={tab.id}
            selected={selectedTab === tab.id}
            key={tab.id}
          >
            {tab.disabled
              ? "This tab is unavailable."
              : `${tab.label} is selected without assigning lifecycle meaning.`}
          </TabPanel>
        ))}
      </section>

      <section class="preview-section" aria-labelledby="feedback-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="feedback-title">00B feedback regression surface</h2>
            <p>Generic loading, progress, absence and error primitives remain content-agnostic.</p>
          </div>
        </div>
        <div class="feedback-grid">
          <Surface kind="inset">
            <div class="inline-feedback">
              <Spinner label="Loading example" />
              <Chip>Neutral chip</Chip>
              <Chip accent>Accent chip</Chip>
            </div>
            <Divider />
            <ProgressBar label="Processing example" value={62} />
          </Surface>
          <StateMessage title="Nothing here yet">No records match the current view.</StateMessage>
          <StateMessage title="Provider unavailable" tone="unavailable">
            This action cannot run until its provider is configured.
          </StateMessage>
          <StateMessage title="Action failed" tone="error">
            The attempted operation did not complete. Existing data is unchanged.
          </StateMessage>
        </div>
      </section>

      <section class="preview-section" aria-labelledby="structure-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="structure-title">00B structural primitives</h2>
            <p>Panel/table/toolbar foundations remain reusable beneath Studio semantics.</p>
          </div>
        </div>
        <Surface>
          <SectionHeading
            title="Structural table"
            description="Semantics are composed above this content-agnostic table."
            actions={
              <Toolbar label="Example panel actions">
                <Button variant="quiet">Filter</Button>
                <Button variant="quiet">Sort</Button>
              </Toolbar>
            }
          />
          <DataTable label="Example structural table">
            <thead>
              <tr>
                <th scope="col">Semantic ID</th>
                <th scope="col">Version</th>
                <th scope="col">Provider reference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>asset.character.jeanne.base</td>
                <td>v003</td>
                <td>Drive source/master</td>
              </tr>
              <tr>
                <td>asset.character.jeanne.base.runtime</td>
                <td>from v003</td>
                <td>Runtime derivative</td>
              </tr>
            </tbody>
          </DataTable>
        </Surface>
      </section>

      <section class="preview-section" aria-labelledby="overlay-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="overlay-title">00B dialog and drawer regression</h2>
            <p>Native modal focus, Escape cancellation and focus restoration remain unchanged.</p>
          </div>
        </div>
        <ActionGroup>
          <Button onClick={() => setDialogOpen(true)} data-testid="open-dialog">
            Open dialog
          </Button>
          <Button onClick={() => setDrawerOpen(true)} data-testid="open-drawer">
            Open drawer
          </Button>
        </ActionGroup>
        <Dialog
          id="preview-dialog"
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Confirm generic action"
          description="This demonstrates focus, cancellation and action placement only."
          actions={
            <>
              <Button variant="quiet" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setDialogOpen(false)}>
                Confirm
              </Button>
            </>
          }
        >
          <TextField
            id="dialog-reference"
            label="Reference"
            defaultValue="REF-001"
            data-autofocus
          />
        </Dialog>
        <Dialog
          id="preview-drawer"
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title="Inspector drawer"
          description="Same accessible overlay primitive with edge placement."
          placement="drawer"
          actions={<Button onClick={() => setDrawerOpen(false)}>Done</Button>}
        >
          <p>Drawer content remains generic until shared Studio shell work begins.</p>
        </Dialog>
      </section>
    </main>
  );
}

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Content Studio root element not found");
render(<App />, root);
