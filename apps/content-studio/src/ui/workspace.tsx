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
import type {
  LifecycleState,
  RuntimeReadinessState,
  ValidationState,
} from "./semantic-model";

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
  children: ComponentChildren;
};

export function StudioShell({
  activeModule,
  collapsed,
  onCollapsedChange,
  onModuleSelect,
  searchSlot,
  sessionSlot,
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
        <p class="studio-shell__fixture-note">UI Lab fixture · no route or auth mutation</p>
      </aside>

      <div class="studio-shell__body">
        <header class="studio-shell__topbar">
          <div class="studio-shell__search" aria-label="Global search and browser slot">
            {searchSlot}
          </div>
          <div class="studio-shell__session" aria-label="User session and role slot">
            {sessionSlot}
          </div>
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

export type WorkspaceStateKind =
  | "loading"
  | "empty"
  | "error"
  | "read-only"
  | "unauthorized";

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
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      queueMicrotask(() => closeRef.current?.focus());
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      queueMicrotask(() => openerRef.current?.focus());
    }
  }, [open]);

  if (!open) {
    return (
      <div class="studio-template__inspector-toggle">
        <Button ref={openerRef} variant="quiet" onClick={() => onOpenChange(true)}>
          Show inspector
        </Button>
      </div>
    );
  }

  return (
    <aside class="studio-template__inspector" aria-label={label} data-testid="workspace-inspector">
      <div class="studio-template__inspector-heading">
        <strong>{label}</strong>
        <Button
          ref={closeRef}
          variant="quiet"
          aria-label="Close inspector"
          onClick={() => onOpenChange(false)}
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
  header: ComponentChildren;
  toolbar?: ComponentChildren;
  children: ComponentChildren;
  inspector?: ComponentChildren;
  inspectorLabel?: string;
  inspectorOpen?: boolean;
  onInspectorOpenChange?: (open: boolean) => void;
  className?: string;
};

function TemplateFrame({
  kind,
  header,
  toolbar,
  children,
  inspector,
  inspectorLabel = "Inspector",
  inspectorOpen = true,
  onInspectorOpenChange,
  className,
}: TemplateFrameProps) {
  const hasInspector = inspector !== undefined && onInspectorOpenChange !== undefined;

  return (
    <article
      class={cx("studio-template", `studio-template--${kind}`, className)}
      data-template={kind}
    >
      {header}
      {toolbar ? <div class="studio-template__toolbar">{toolbar}</div> : null}
      <div
        class={cx(
          "studio-template__body",
          hasInspector && inspectorOpen && "studio-template__body--with-inspector",
        )}
      >
        <div class="studio-template__content">{children}</div>
        {hasInspector ? (
          <WorkspaceInspector
            label={inspectorLabel}
            open={inspectorOpen}
            onOpenChange={onInspectorOpenChange}
          >
            {inspector}
          </WorkspaceInspector>
        ) : null}
      </div>
    </article>
  );
}

export type CollectionTemplateProps = Omit<TemplateFrameProps, "kind"> & {
  filterSlot?: ComponentChildren;
};

export function CollectionTemplate({ filterSlot, children, ...props }: CollectionTemplateProps) {
  return (
    <TemplateFrame {...props} kind="collection">
      {filterSlot ? <div class="studio-collection__filters">{filterSlot}</div> : null}
      <div class="studio-collection__results">{children}</div>
    </TemplateFrame>
  );
}

type WorkspaceTab = {
  id: string;
  label: string;
  disabled?: boolean;
};

export type EntityWorkspaceTemplateProps = Omit<TemplateFrameProps, "kind" | "children"> & {
  tabsId: string;
  tabs: readonly WorkspaceTab[];
  selectedTab: string;
  onTabSelect: (id: string) => void;
  panels: Readonly<Record<string, ComponentChildren>>;
};

export function EntityWorkspaceTemplate({
  tabsId,
  tabs,
  selectedTab,
  onTabSelect,
  panels,
  ...props
}: EntityWorkspaceTemplateProps) {
  return (
    <TemplateFrame {...props} kind="entity">
      <Tabs
        id={tabsId}
        label="Entity workspace sections"
        tabs={tabs}
        selectedId={selectedTab}
        onSelect={onTabSelect}
      />
      {tabs.map((tab) => (
        <TabPanel
          tabsId={tabsId}
          tabId={tab.id}
          selected={selectedTab === tab.id}
          key={tab.id}
        >
          {panels[tab.id] ?? <WorkspaceStateRegion state="empty" />}
        </TabPanel>
      ))}
    </TemplateFrame>
  );
}

export function AssetBoardTemplate(props: Omit<TemplateFrameProps, "kind">) {
  return <TemplateFrame {...props} kind="asset-board" />;
}

export function OperationalQueueTemplate(props: Omit<TemplateFrameProps, "kind">) {
  return <TemplateFrame {...props} kind="operational-queue" />;
}

export function DashboardTemplate(props: Omit<TemplateFrameProps, "kind">) {
  return <TemplateFrame {...props} kind="dashboard" />;
}

export function TemplateFixtureHeading({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status?: ComponentChildren;
}) {
  return (
    <Surface kind="inset" className="studio-template-fixture-heading">
      <SectionHeading title={title} description={description} actions={status} />
    </Surface>
  );
}

export function TemplateToolbar({ children }: { children: ComponentChildren }) {
  return (
    <Toolbar label="Workspace template actions">
      <ActionGroup>{children}</ActionGroup>
    </Toolbar>
  );
}

export function AuthoritySummary({
  validation,
  runtimeReadiness,
}: {
  validation: ValidationState;
  runtimeReadiness: RuntimeReadinessState;
}) {
  return (
    <div class="studio-authority-summary">
      <Chip>Git definitions</Chip>
      <Chip>Drive masters</Chip>
      <Chip>Registry workflow</Chip>
      <ValidationBadge state={validation} />
      <RuntimeReadinessBadge state={runtimeReadiness} />
    </div>
  );
}
