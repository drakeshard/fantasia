import type { ComponentChildren, ComponentProps } from "preact";
import { useRef } from "preact/hooks";
import { Button, Spinner, StateMessage } from "./primitives";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type SectionProps = {
  title: string;
  description?: string | undefined;
  actions?: ComponentChildren | undefined;
  children: ComponentChildren;
};

export function Section({ title, description, actions, children }: SectionProps) {
  return (
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
  );
}

export function DetailSection(props: SectionProps) {
  return <Section {...props} />;
}

export function KeyValueList({ items, label }: { items: readonly { label: string; value: ComponentChildren }[]; label?: string | undefined }) {
  return (
    <dl class="studio-key-value-list" aria-label={label}>
      {items.map((item) => (
        <div class="studio-key-value-list__item" key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function StatusGroup({ label, children }: { label: string; children: ComponentChildren }) {
  return <div class="studio-status-group" aria-label={label}>{children}</div>;
}

export function FilterBar({
  label,
  children,
  activeSummary,
  onClear,
}: {
  label: string;
  children: ComponentChildren;
  activeSummary?: string | undefined;
  onClear?: (() => void) | undefined;
}) {
  return (
    <section class="studio-filter-bar" aria-label={label}>
      <div class="studio-filter-bar__controls">{children}</div>
      {activeSummary || onClear ? (
        <div class="studio-filter-bar__summary" aria-live="polite">
          <span>{activeSummary ?? "Filters active"}</span>
          {onClear ? <Button variant="quiet" onClick={onClear}>Clear filters</Button> : null}
        </div>
      ) : null}
    </section>
  );
}

export function MasterDetailLayout({ masterLabel, master, detail }: { masterLabel: string; master: ComponentChildren; detail: ComponentChildren }) {
  return (
    <div class="studio-master-detail" data-testid="master-detail-layout">
      <aside class="studio-master-detail__master" aria-label={masterLabel}>{master}</aside>
      <div class="studio-master-detail__detail">{detail}</div>
    </div>
  );
}

export function SelectableCollection({ label, children }: { label: string; children: ComponentChildren }) {
  return <div class="studio-selectable-collection" role="listbox" aria-label={label}>{children}</div>;
}

type SelectableRowProps = Omit<ComponentProps<"button">, "class" | "className" | "role"> & {
  selected: boolean;
  title: ComponentChildren;
  metadata?: ComponentChildren | undefined;
  status?: ComponentChildren | undefined;
};

export function SelectableRow({ selected, title, metadata, status, onKeyDown, ...props }: SelectableRowProps) {
  return (
    <button
      {...props}
      type="button"
      class="studio-selectable-row"
      role="option"
      aria-selected={selected}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        const key = event.key;
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(key)) return;
        const list = event.currentTarget.closest<HTMLElement>('[role="listbox"]');
        if (!list) return;
        const rows = Array.from(list.querySelectorAll<HTMLButtonElement>('.studio-selectable-row:not(:disabled)'));
        const current = rows.indexOf(event.currentTarget);
        if (current < 0 || rows.length === 0) return;
        event.preventDefault();
        const next = key === "Home" ? 0 : key === "End" ? rows.length - 1 : (current + (key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length;
        rows[next]?.focus();
      }}
    >
      <span class="studio-selectable-row__copy">
        <strong>{title}</strong>
        {metadata ? <span>{metadata}</span> : null}
      </span>
      {status ? <span class="studio-selectable-row__status">{status}</span> : null}
    </button>
  );
}

export type EmptyStateTone = "empty" | "loading" | "unavailable" | "error";

export function EmptyState({ tone = "empty", title, children, action }: { tone?: EmptyStateTone | undefined; title: string; children: ComponentChildren; action?: ComponentChildren | undefined }) {
  if (tone === "loading") {
    return (
      <div class="studio-empty-state" data-state="loading" role="status">
        <Spinner label={title} />
        <div><strong>{title}</strong><span>{children}</span></div>
      </div>
    );
  }
  return (
    <StateMessage title={title} tone={tone === "error" ? "error" : tone === "unavailable" ? "unavailable" : "neutral"} action={action}>
      {children}
    </StateMessage>
  );
}

export function MetadataRow({ label, primary, secondary, trailing }: { label?: string | undefined; primary: ComponentChildren; secondary?: ComponentChildren | undefined; trailing?: ComponentChildren | undefined }) {
  return (
    <div class="studio-metadata-row">
      <div class="studio-metadata-row__copy">
        {label ? <span>{label}</span> : null}
        <strong>{primary}</strong>
        {secondary ? <small>{secondary}</small> : null}
      </div>
      {trailing ? <div class="studio-metadata-row__trailing">{trailing}</div> : null}
    </div>
  );
}

export function FilePicker({ id, label, value, disabled = false, hint, onChange }: { id: string; label: string; value: File | null; disabled?: boolean | undefined; hint?: string | undefined; onChange: (file: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div class="studio-file-picker">
      <span class="studio-file-picker__label">{label}</span>
      <input ref={inputRef} id={id} class="studio-file-picker__native" type="file" disabled={disabled} onChange={(event) => onChange(event.currentTarget.files?.[0] ?? null)} />
      <button
        type="button"
        class={cx("studio-file-picker__drop", value && "is-selected")}
        disabled={disabled}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => { if (!disabled) event.preventDefault(); }}
        onDrop={(event) => { event.preventDefault(); if (!disabled) onChange(event.dataTransfer?.files?.[0] ?? null); }}
      >
        <span class="studio-file-picker__mark" aria-hidden="true">⇧</span>
        <span class="studio-file-picker__copy">
          <strong>{value ? value.name : "Choose source/master"}</strong>
          <span>{value ? "Select again to replace this pending file." : "Drop a file here or choose from this device."}</span>
        </span>
        <span class="studio-file-picker__action">{value ? "Replace" : "Select file"}</span>
      </button>
      {hint ? <span class="studio-file-picker__hint" id={`${id}-hint`}>{hint}</span> : null}
      {value ? (
        <MetadataRow
          label="Selected file"
          primary={value.name}
          secondary={`${value.type || "File type unavailable"} · ${formatFileSize(value.size)}`}
          trailing={<Button variant="quiet" disabled={disabled} onClick={() => onChange(null)}>Remove</Button>}
        />
      ) : null}
    </div>
  );
}

function formatFileSize(value: number): string {
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}
