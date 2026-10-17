import { render } from "preact";
import { useState } from "preact/hooks";
import "./styles/tokens.css";
import "./styles/base.css";
import "./ui/primitives.css";
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
  List,
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

const lifecycle = [
  "working",
  "candidate",
  "in-review",
  "approved",
  "frozen",
  "runtime-ready",
  "published",
  "retired",
] as const;

const validation = ["passed", "warning", "blocking", "unknown"] as const;

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "assets", label: "Assets" },
  { id: "history", label: "History" },
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
        <p class="foundation-preview__eyebrow">UI Lab · GAME-STUDIO00B</p>
        <h1 id="studio-title">Fantasia Content Studio</h1>
        <p>
          Reusable, content-agnostic primitives and interaction states. Semantic lifecycle, review,
          validation and runtime components remain reserved for the next layer.
        </p>
      </header>

      <section class="preview-section" aria-labelledby="actions-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="actions-title">Actions and interaction states</h2>
            <p>Rest, hover, focus, pressed, disabled and pending all share one token contract.</p>
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
            <h2 id="forms-title">Form controls</h2>
            <p>Native controls retain labels, descriptions, invalid state and disabled behavior.</p>
          </div>
        </div>
        <div class="form-grid">
          <TextField
            id="studio-search"
            type="search"
            label="Search"
            placeholder="Search semantic ID or title"
            hint="Search remains presentation-only in this foundation lab."
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
            description="Generic selection primitive for later list and table composition."
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
            <h2 id="navigation-title">Tabs and keyboard navigation</h2>
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
              : `${tab.label} is selected without assigning any Studio lifecycle meaning.`}
          </TabPanel>
        ))}
      </section>

      <section class="preview-section" aria-labelledby="structure-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="structure-title">Surfaces and structure</h2>
            <p>Composable panel, card, inset, toolbar, list and table foundations.</p>
          </div>
        </div>
        <Surface>
          <SectionHeading
            title="Production panel anatomy"
            description="Shared structure only; no workspace semantics are introduced here."
            actions={
              <Toolbar label="Example panel actions">
                <Button variant="quiet">Filter</Button>
                <Button variant="quiet">Sort</Button>
              </Toolbar>
            }
          />
          <Divider />
          <div class="surface-composition-grid">
            <Surface kind="card">
              <strong>Raised card</strong>
              <p>Groups a focused set of controls or metadata.</p>
            </Surface>
            <Surface kind="inset">
              <strong>Inset surface</strong>
              <p>Separates dense secondary information from the parent panel.</p>
            </Surface>
          </div>
          <Divider />
          <List label="Example structural list">
            <li>Semantic identity stays outside primitive styling.</li>
            <li>Rows remain readable without relying on color alone.</li>
          </List>
          <Divider />
          <DataTable label="Example structural table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col">Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Example alpha</td>
                <td>Generic row</td>
                <td>REF-001</td>
              </tr>
              <tr>
                <td>Example beta</td>
                <td>Generic row</td>
                <td>REF-002</td>
              </tr>
            </tbody>
          </DataTable>
        </Surface>
      </section>

      <section class="preview-section" aria-labelledby="feedback-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="feedback-title">Feedback and truthful empty states</h2>
            <p>Neutral foundations communicate progress, absence, unavailability and errors.</p>
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

      <section class="preview-section" aria-labelledby="overlay-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="overlay-title">Dialog and drawer</h2>
            <p>
              Native modal behavior traps focus; Escape cancels and focus returns to the opener.
            </p>
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

      <section class="preview-section" aria-labelledby="tokens-title">
        <div class="preview-section__heading">
          <div>
            <h2 id="tokens-title">00A semantic-token separation</h2>
            <p>
              These are token swatches only. Lifecycle and validation components are intentionally
              deferred to GAME-STUDIO00C.
            </p>
          </div>
        </div>
        <p class="preview-meta">Lifecycle token family</p>
        <div class="semantic-grid">
          {lifecycle.map((state) => (
            <span class={`semantic-chip semantic-chip--lifecycle-${state}`} key={state}>
              {state.replaceAll("-", " ").toUpperCase()}
            </span>
          ))}
        </div>
        <p class="preview-meta preview-meta--spaced">Validation / readiness token family</p>
        <div class="semantic-grid">
          {validation.map((state) => (
            <span class={`semantic-chip semantic-chip--validation-${state}`} key={state}>
              {state.toUpperCase()}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Content Studio root element not found");
render(<App />, root);
