import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import {
  ActionGroup,
  Button,
  Chip,
  SectionHeading,
  Spinner,
  StateMessage,
  Surface,
  TabPanel,
  Tabs,
  Toolbar,
} from "./primitives";
import {
  LifecycleBadge,
  ReadinessSummary,
  RuntimeReadinessBadge,
  ValidationBadge,
  VersionBadge,
} from "./semantic";
import type { LifecycleState, RuntimeReadinessState, ValidationState } from "./semantic-model";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export const studioModules = [
  { id: "dashboard", label: "Dashboard", marker: "D" },
  { id: "characters", label: "Characters", marker: "C" },
  { id: "equipment", label: "Equipment", marker: "E" },
  { id: "skills", label: "Skills", marker: "S" },
  { id: "story", label: "Story", marker: "ST" },
  { id: "maps-encounters", label: "Maps & Encounters", marker: "M" },
  { id: "enemies", label: "Enemies", marker: "EN" },
  { id: "assets", label: "Assets", marker: "A" },
  { id: "releases", label: "Releases", marker: "R" },
] as const;

export type StudioModuleId = (typeof studioModules)[number]["id"];
export type WorkspaceTemplateKind =
  | "collection"
  | "entity"
  | "asset-board"
  | "operational-queue"
  | "dashboard";

export type StudioShellProps = {
  activeModule: StudioModuleId;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  onModuleSelect: (module: StudioModuleId) => void;
  searchSlot: ComponentChildren;
  sessionSlot: ComponentChildren;
  showFixtureNote?: boolean;
  children: ComponentChildren;
};

export function StudioShell({
  activeModule,
  collapsed,
  onCollapsedChange,
  onModuleSelect,
  searchSlot,
  sessionSlot,
  showFixtureNote = true,
  children,
}: StudioShellProps) {
  return (
    <div
      class={cx("studio-shell", collapsed && "studio-shell--collapsed")}
      data-testid="studio-shell"
    >
      <aside class="studio-shell__sidebar" aria-label="Content Studio navigation">
        <div class="studio-shell__brand">
          <span class="studio-shell__brand-mark" aria-hidden="true">
            F
          </span>
          <div class="studio-shell__brand-copy">
            <strong>Fantasia</strong>
            <span>Content Studio</span>
          </div>
        </div>
        <Button
          variant="quiet"
          className="studio-shell__collapse"
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
          <span class="studio-shell__collapse-label">{collapsed ? "Expand" : "Collapse"}</span>
        </Button>
        <nav class="studio-shell__nav" aria-label="Studio modules">
          {studioModules.map((module) => (
            <button
              type="button"
              class="studio-shell__nav-item"
              aria-label={module.label}
              aria-current={activeModule === module.id ? "page" : undefined}
              onClick={() => onModuleSelect(module.id)}
              key={module.id}
            >
              <span class="studio-shell__nav-marker" aria-hidden="true">
                {module.marker}
              </span>
              <span class="studio-shell__nav-label">{module.label}</span>
            </button>
          ))}
        </nav>
        {showFixtureNote ? (
          <p class="studio-shell__fixture-note">UI Lab fixture · no route or auth mutation</p>
        ) : null}
      </aside>

      <div class="studio-shell__body">
        <header class="studio-shell__topbar">
          <section class="studio-shell__search" aria-label="Global search and browser slot">
            {searchSlot}
          </section>
          <section class="studio-shell__session" aria-label="User session and role slot">
            {sessionSlot}
          </section>
        </header>
        <div class="studio-shell__viewport">{children}</div>
      </div>
    </div>
  );
}

type WorkspaceHeaderProps = {
  breadcrumbs?: readonly string[];
  title: string;
  description?: string;
  semanticId?: string;
  lifecycle?: LifecycleState;
  versionLabel?: string;
  sourceSummary: string;
  validation: ValidationState;
  runtimeReadiness: RuntimeReadinessState;
  blockingCount?: number;
  warningCount?: number;
  actionSlot?: ComponentChildren;
};

export function WorkspaceHeader({
  breadcrumbs = [],
  title,
  description,
  semanticId,
  lifecycle,
  versionLabel,
  sourceSummary,
  validation,
  runtimeReadiness,
  blockingCount = 0,
  warningCount = 0,
  actionSlot,
}: WorkspaceHeaderProps) {
  return (
    <header class="studio-workspace-header">
      {breadcrumbs.length > 0 ? (
        <nav class="studio-workspace-header__breadcrumbs" aria-label="Workspace breadcrumb">
          <ol>
            {breadcrumbs.map((crumb) => (
              <li key={crumb}>{crumb}</li>
            ))}
          </ol>
        </nav>
      ) : null}
      <div class="studio-workspace-header__primary">
        <div class="studio-workspace-header__identity">
          <span class="studio-workspace-header__kicker">Workspace</span>
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
          {semanticId ? <code>{semanticId}</code> : null}
        </div>
        <div class="studio-workspace-header__actions">
          {lifecycle ? <LifecycleBadge state={lifecycle} /> : null}
          {versionLabel ? <VersionBadge label={versionLabel} current /> : null}
          {actionSlot}
        </div>
      </div>
      <div class="studio-workspace-header__context">
        <div class="studio-workspace-header__authority">
          <span>Authority / source</span>
          <strong>{sourceSummary}</strong>
        </div>
        <ReadinessSummary
          contentValidation={validation}
          runtimeReadiness={runtimeReadiness}
          blockingCount={blockingCount}
          warningCount={warningCount}
        />
      </div>
    </header>
  );
}

export type WorkspaceStateKind = "loading" | "empty" | "error" | "read-only" | "unauthorized";

export function WorkspaceStateRegion({ state }: { state: WorkspaceStateKind }) {
  if (state === "loading") {
    return (
      <div class="studio-template-state" data-state="loading">
        <Spinner label="Loading workspace fixture" />
        <div>
          <strong>Loading</strong>
          <span>Waiting for the selected read model. Existing content is not fabricated.</span>
        </div>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <StateMessage title="No records yet">
        The source returned no records for this view. Empty is distinct from unavailable.
      </StateMessage>
    );
  }

  if (state === "error") {
    return (
      <StateMessage title="Read failed" tone="error">
        The source could not be read. Existing authoritative data is unchanged.
      </StateMessage>
    );
  }

  if (state === "unauthorized") {
    return (
      <StateMessage title="Access not granted" tone="unavailable">
        This fixture demonstrates unauthorized presentation only; real role enforcement is not
        implemented in 00D.
      </StateMessage>
    );
  }

  return (
    <StateMessage title="Read-only view" tone="unavailable">
      The current role may inspect this fixture but no privileged mutation action is exposed.
    </StateMessage>
  );
}

type InspectorProps = {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ComponentChildren;
};

function WorkspaceInspector({ label, open, onOpenChange, children }: InspectorProps) {
  const openerContainerRef = useRef<HTMLDivElement>(null);
  const closeContainerRef = useRef<HTMLDivElement>(null);
  const shouldRestoreFocusRef = useRef(false);

  useEffect(() => {
    if (open) {
      queueMicrotask(() =>
        closeContainerRef.current?.querySelector<HTMLButtonElement>("button")?.focus(),
      );
      return;
    }
    if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      queueMicrotask(() =>
        openerContainerRef.current?.querySelector<HTMLButtonElement>("button")?.focus(),
      );
    }
  }, [open]);

  if (!open) {
    return (
      <div ref={openerContainerRef} class="studio-template__inspector-toggle">
        <Button variant="quiet" onClick={() => onOpenChange(true)}>
          Show inspector
        </Button>
      </div>
    );
  }

  return (
    <aside class="studio-template__inspector" aria-label={label} data-testid="workspace-inspector">
      <div ref={closeContainerRef} class="studio-template__inspector-heading">
        <strong>{label}</strong>
        <Button
          variant="quiet"
          aria-label="Close inspector"
          onClick={() => {
            shouldRestoreFocusRef.current = true;
            onOpenChange(false);
          }}
        >
          Close
        </Button>
      </div>
      <div class="studio-template__inspector-body">{children}</div>
    </aside>
  );
}

type TemplateFrameProps = {
  kind: WorkspaceTemplateKind;
  children: ComponentChildren;
  inspector?: ComponentChildren;
  inspectorLabel?: string;
};

function TemplateFrame({
  kind,
  children,
  inspector,
  inspectorLabel = "Workspace inspector",
}: TemplateFrameProps) {
  const hasInspector = inspector !== undefined && inspector !== null;

  return (
    <section class="studio-template" data-template={kind}>
      <div class="studio-template__main">{children}</div>
      {hasInspector ? (
        <WorkspaceInspector label={inspectorLabel} open onOpenChange={() => undefined}>
          {inspector}
        </WorkspaceInspector>
      ) : null}
    </section>
  );
}

export function CollectionTemplate({
  header,
  toolbar,
  filters,
  summary,
  children,
  inspector,
}: {
  header: ComponentChildren;
  toolbar: ComponentChildren;
  filters?: ComponentChildren;
  summary?: ComponentChildren;
  children: ComponentChildren;
  inspector?: ComponentChildren;
}) {
  return (
    <div class="studio-template-shell">
      {header}
      <Toolbar label="Collection actions">{toolbar}</Toolbar>
      {filters ? <Surface kind="inset">{filters}</Surface> : null}
      {summary ? <Surface kind="card">{summary}</Surface> : null}
      <TemplateFrame kind="collection" inspector={inspector}>
        {children}
      </TemplateFrame>
    </div>
  );
}

export function EntityTemplate({
  header,
  tabs,
  inspector,
  children,
}: {
  header: ComponentChildren;
  tabs: ComponentChildren;
  inspector: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <div class="studio-template-shell">
      {header}
      {tabs}
      <TemplateFrame kind="entity" inspector={inspector}>
        {children}
      </TemplateFrame>
    </div>
  );
}

export function AssetBoardTemplate({
  header,
  toolbar,
  filters,
  children,
  inspector,
}: {
  header: ComponentChildren;
  toolbar: ComponentChildren;
  filters?: ComponentChildren;
  children: ComponentChildren;
  inspector?: ComponentChildren;
}) {
  return (
    <div class="studio-template-shell">
      {header}
      <Toolbar label="Asset board actions">{toolbar}</Toolbar>
      {filters ? <Surface kind="inset">{filters}</Surface> : null}
      <TemplateFrame kind="asset-board" inspector={inspector}>
        {children}
      </TemplateFrame>
    </div>
  );
}

export function OperationalQueueTemplate({
  header,
  toolbar,
  children,
  inspector,
}: {
  header: ComponentChildren;
  toolbar: ComponentChildren;
  children: ComponentChildren;
  inspector?: ComponentChildren;
}) {
  return (
    <div class="studio-template-shell">
      {header}
      <Toolbar label="Queue actions">{toolbar}</Toolbar>
      <TemplateFrame kind="operational-queue" inspector={inspector}>
        {children}
      </TemplateFrame>
    </div>
  );
}

export function DashboardTemplate({
  header,
  summary,
  children,
}: {
  header: ComponentChildren;
  summary?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <div class="studio-template-shell">
      {header}
      {summary ? <Surface kind="card">{summary}</Surface> : null}
      <TemplateFrame kind="dashboard">{children}</TemplateFrame>
    </div>
  );
}

export function TemplateFixtureHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <SectionHeading
      title={title}
      description={description}
      actions={
        <ActionGroup>
          <Chip accent>Template fixture</Chip>
        </ActionGroup>
      }
    />
  );
}

export function TemplateFixtureTabs({
  id,
  selectedId,
  onSelect,
}: {
  id: string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "gameplay", label: "Gameplay" },
    { id: "assets", label: "Assets" },
    { id: "history", label: "History" },
  ] as const;

  return (
    <>
      <Tabs id={id} label="Workspace sections" tabs={tabs} selectedId={selectedId} onSelect={onSelect} />
      {tabs.map((tab) => (
        <TabPanel tabsId={id} tabId={tab.id} selected={selectedId === tab.id} key={tab.id}>
          <StateMessage title={`${tab.label} section`}>
            Waiting for the selected read model.
          </StateMessage>
        </TabPanel>
      ))}
    </>
  );
}
