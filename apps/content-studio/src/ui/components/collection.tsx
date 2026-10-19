import type { ComponentChildren, TargetedKeyboardEvent } from "preact";

function moveFocus(event: TargetedKeyboardEvent<HTMLDivElement>) {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>("[data-selectable-row]") : null;
  if (!target) return;
  const rows = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("[data-selectable-row]:not(:disabled)")];
  if (rows.length === 0) return;
  const current = rows.indexOf(target);
  if (current < 0) return;
  const next = event.key === "Home" ? 0 : event.key === "End" ? rows.length - 1 : event.key === "ArrowDown" ? (current + 1) % rows.length : (current - 1 + rows.length) % rows.length;
  event.preventDefault();
  rows[next]?.focus();
}

export function FilterBar({ primary, secondary, actions, expanded = false, label = "Filters" }: { primary: ComponentChildren; secondary?: ComponentChildren; actions?: ComponentChildren; expanded?: boolean; label?: string }) {
  return (
    <section class="studio-component-filter-bar" aria-label={label}>
      <div class="studio-component-filter-bar__primary">{primary}</div>
      {actions ? <div class="studio-component-filter-bar__actions">{actions}</div> : null}
      {expanded && secondary ? <div class="studio-component-filter-bar__secondary">{secondary}</div> : null}
    </section>
  );
}

export function SelectableCollection({ label, children, testId }: { label: string; children: ComponentChildren; testId?: string }) {
  return <div class="studio-component-selectable" role="listbox" aria-label={label} data-testid={testId} onKeyDown={moveFocus}>{children}</div>;
}

export function SelectableRow({ selected, onSelect, children, disabled = false, label }: { selected: boolean; onSelect: () => void; children: ComponentChildren; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button"
      class="studio-component-selectable-row"
      role="option"
      aria-selected={selected}
      aria-label={label}
      data-selectable-row
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={onSelect}
    >
      {children}
    </button>
  );
}

export function MasterDetailLayout({ master, detail, masterLabel = "Collection", detailLabel = "Details" }: { master: ComponentChildren; detail: ComponentChildren; masterLabel?: string; detailLabel?: string }) {
  return (
    <div class="studio-component-master-detail">
      <aside class="studio-component-master-detail__master" aria-label={masterLabel}>{master}</aside>
      <section class="studio-component-master-detail__detail" aria-label={detailLabel}>{detail}</section>
    </div>
  );
}
