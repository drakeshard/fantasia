import type { ComponentChildren } from "preact";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type SurfaceProps = {
  kind?: "panel" | "card" | "inset";
  children: ComponentChildren;
  /** Shared-layer hook only. Production feature code is statically forbidden from supplying this. */
  className?: string;
};

export function Surface({ kind = "panel", children, className }: SurfaceProps) {
  return <div class={cx("ui-surface", `ui-surface--${kind}`, className)}>{children}</div>;
}

export function Divider() {
  return <hr class="ui-divider" />;
}

export function SectionHeading({ title, description, actions }: { title: string; description?: string; actions?: ComponentChildren }) {
  return (
    <div class="ui-section-heading">
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div class="ui-section-heading__actions">{actions}</div> : null}
    </div>
  );
}

export function Toolbar({ label, children }: { label: string; children: ComponentChildren }) {
  return <div class="ui-toolbar" role="toolbar" aria-label={label}>{children}</div>;
}

export function ActionGroup({ children }: { children: ComponentChildren }) {
  return <div class="ui-action-group">{children}</div>;
}

export function List({ children, label }: { children: ComponentChildren; label?: string }) {
  return <ul class="ui-list" aria-label={label}>{children}</ul>;
}

export function DataTable({ children, label }: { children: ComponentChildren; label: string }) {
  return <div class="ui-table-frame"><table class="ui-table" aria-label={label}>{children}</table></div>;
}
