import type { ComponentChildren } from "preact";
import { Surface } from "../primitives";

export function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <Surface kind="inset">
      <section class="studio-component-section">
        <header class="studio-component-section__header">
          <div>
            <h4>{title}</h4>
            {description ? <p>{description}</p> : null}
          </div>
          {actions ? <div class="studio-component-section__actions">{actions}</div> : null}
        </header>
        <div class="studio-component-section__body">{children}</div>
      </section>
    </Surface>
  );
}

export function DetailSection({ title, actions, children }: { title: string; actions?: ComponentChildren; children: ComponentChildren }) {
  return (
    <section class="studio-component-detail-section">
      <header>
        <h5>{title}</h5>
        {actions ? <div>{actions}</div> : null}
      </header>
      <div>{children}</div>
    </section>
  );
}

export function KeyValueList({ children, columns = 2, label }: { children: ComponentChildren; columns?: 1 | 2 | 3; label?: string }) {
  return <dl class={`studio-component-facts studio-component-facts--${columns}`} aria-label={label}>{children}</dl>;
}

export function KeyValue({ label, children }: { label: string; children: ComponentChildren }) {
  return <div class="studio-component-fact"><dt>{label}</dt><dd>{children}</dd></div>;
}

export function StatusGroup({ children, label = "Status" }: { children: ComponentChildren; label?: string }) {
  return <div class="studio-component-status-group" aria-label={label}>{children}</div>;
}
