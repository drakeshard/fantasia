import type { ComponentChildren } from "preact";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type StatusTone = "neutral" | "success" | "warning" | "error";

export function StatusTag({ children, tone = "neutral" }: { children: ComponentChildren; tone?: StatusTone }) {
  return <span class={cx("studio-component-status-tag", `studio-component-status-tag--${tone}`)}>{children}</span>;
}

export function UtilityStatus({
  label,
  value,
  detail,
  tone = "neutral",
  action,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: StatusTone;
  action?: ComponentChildren;
}) {
  return (
    <div class={cx("studio-component-utility-status", `studio-component-utility-status--${tone}`)}>
      <span class="studio-component-utility-status__indicator" aria-hidden="true" />
      <span class="studio-component-utility-status__copy">
        <small>{label}</small>
        <strong>{value}</strong>
        {detail ? <span>{detail}</span> : null}
      </span>
      {action ? <span class="studio-component-utility-status__action">{action}</span> : null}
    </div>
  );
}

export function CollectionPanel({
  title,
  count,
  actions,
  children,
}: {
  title: string;
  count?: ComponentChildren;
  actions?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <section class="studio-component-collection-panel">
      <header class="studio-component-collection-panel__header">
        <span class="studio-component-collection-panel__title">{title}</span>
        {count ? <strong class="studio-component-collection-panel__count">{count}</strong> : null}
        {actions ? <div class="studio-component-collection-panel__actions">{actions}</div> : null}
      </header>
      <div class="studio-component-collection-panel__body">{children}</div>
    </section>
  );
}

export function MediaCollectionItem({
  marker,
  title,
  subtitle,
  trailing,
  meta,
}: {
  marker: ComponentChildren;
  title: ComponentChildren;
  subtitle?: ComponentChildren;
  trailing?: ComponentChildren;
  meta?: ComponentChildren;
}) {
  return (
    <span class="studio-component-media-item">
      <span class="studio-component-media-item__marker" aria-hidden="true">{marker}</span>
      <span class="studio-component-media-item__copy">
        <span class="studio-component-media-item__topline">
          <strong>{title}</strong>
          {trailing ? <span class="studio-component-media-item__trailing">{trailing}</span> : null}
        </span>
        {subtitle ? <span class="studio-component-media-item__subtitle">{subtitle}</span> : null}
        {meta ? <span class="studio-component-media-item__meta">{meta}</span> : null}
      </span>
    </span>
  );
}

export function DetailPanel({
  label,
  eyebrow,
  title,
  semanticId,
  status,
  children,
}: {
  label: string;
  eyebrow?: ComponentChildren;
  title: ComponentChildren;
  semanticId?: ComponentChildren;
  status?: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <article class="studio-component-detail-panel" aria-label={label}>
      <header class="studio-component-detail-panel__header">
        <div class="studio-component-detail-panel__identity">
          {eyebrow ? <span class="studio-component-detail-panel__eyebrow">{eyebrow}</span> : null}
          <h3>{title}</h3>
          {semanticId ? <code>{semanticId}</code> : null}
        </div>
        {status ? <div class="studio-component-detail-panel__status">{status}</div> : null}
      </header>
      {children}
    </article>
  );
}

export function PreviewSummaryLayout({ preview, summary }: { preview: ComponentChildren; summary: ComponentChildren }) {
  return (
    <div class="studio-component-preview-summary">
      <div class="studio-component-preview-summary__preview">{preview}</div>
      <aside class="studio-component-preview-summary__summary">{summary}</aside>
    </div>
  );
}

export function MediaPreview({
  src,
  alt,
  title,
  description,
  marker = "◇",
  testId,
}: {
  src?: string | null;
  alt?: string;
  title: string;
  description: string;
  marker?: ComponentChildren;
  testId?: string;
}) {
  return (
    <div class="studio-component-media-preview" data-testid={testId}>
      {src ? (
        <img class="studio-component-media-preview__image" src={src} alt={alt ?? title} />
      ) : (
        <div class="studio-component-media-preview__empty">
          <span class="studio-component-media-preview__marker" aria-hidden="true"><span>{marker}</span></span>
          <strong>{title}</strong>
          <small>{description}</small>
        </div>
      )}
    </div>
  );
}

export function DetailRow({
  title,
  description,
  meta,
  trailing,
}: {
  title: ComponentChildren;
  description?: ComponentChildren;
  meta?: ComponentChildren;
  trailing?: ComponentChildren;
}) {
  return (
    <div class="studio-component-detail-row">
      <div class="studio-component-detail-row__copy">
        <strong>{title}</strong>
        {description ? <span>{description}</span> : null}
        {meta ? <small>{meta}</small> : null}
      </div>
      {trailing ? <div class="studio-component-detail-row__trailing">{trailing}</div> : null}
    </div>
  );
}
