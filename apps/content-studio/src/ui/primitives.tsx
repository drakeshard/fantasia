import type { ComponentChildren, ComponentProps } from "preact";
import { useEffect, useRef } from "preact/hooks";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type ButtonProps = Omit<ComponentProps<"button">, "class" | "className"> & {
  variant?: "primary" | "secondary" | "quiet";
  pending?: boolean;
  className?: string;
};

export function Button({
  variant = "secondary",
  pending = false,
  disabled = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      class={cx("ui-button", `ui-button--${variant}`, className)}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? <Spinner label="Working" size="small" /> : null}
      <span>{children}</span>
    </button>
  );
}

type IconButtonProps = Omit<ButtonProps, "children"> & {
  label: string;
  icon: ComponentChildren;
};

export function IconButton({ label, icon, ...props }: IconButtonProps) {
  return (
    <Button {...props} className={cx("ui-icon-button", props.className)} aria-label={label}>
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
}

type FieldBaseProps = {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
};

function FieldMessage({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  if (error) {
    return (
      <span class="ui-field__message ui-field__message--error" id={`${id}-error`}>
        {error}
      </span>
    );
  }
  if (hint) {
    return (
      <span class="ui-field__message" id={`${id}-hint`}>
        {hint}
      </span>
    );
  }
  return null;
}

function describedBy(id: string, hint?: string, error?: string) {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

type TextFieldProps = FieldBaseProps &
  Omit<ComponentProps<"input">, "id" | "type" | "disabled" | "required" | "class"> & {
    type?: "text" | "search" | "email";
  };

export function TextField({
  id,
  label,
  hint,
  error,
  required = false,
  disabled = false,
  type = "text",
  ...props
}: TextFieldProps) {
  return (
    <label class="ui-field" for={id}>
      <span class="ui-field__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <input
        {...props}
        class="ui-control"
        id={id}
        type={type}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
      />
      <FieldMessage id={id} hint={hint} error={error} />
    </label>
  );
}

type TextAreaProps = FieldBaseProps &
  Omit<ComponentProps<"textarea">, "id" | "disabled" | "required" | "class">;

export function TextArea({
  id,
  label,
  hint,
  error,
  required = false,
  disabled = false,
  ...props
}: TextAreaProps) {
  return (
    <label class="ui-field" for={id}>
      <span class="ui-field__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <textarea
        {...props}
        class="ui-control ui-control--textarea"
        id={id}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
      />
      <FieldMessage id={id} hint={hint} error={error} />
    </label>
  );
}

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectFieldProps = FieldBaseProps &
  Omit<ComponentProps<"select">, "id" | "disabled" | "required" | "class" | "children"> & {
    options: readonly SelectOption[];
  };

export function SelectField({
  id,
  label,
  hint,
  error,
  required = false,
  disabled = false,
  options,
  ...props
}: SelectFieldProps) {
  return (
    <label class="ui-field" for={id}>
      <span class="ui-field__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <select
        {...props}
        class="ui-control ui-control--select"
        id={id}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, hint, error)}
      >
        {options.map((option) => (
          <option value={option.value} disabled={option.disabled} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <FieldMessage id={id} hint={hint} error={error} />
    </label>
  );
}

type CheckboxProps = Omit<ComponentProps<"input">, "id" | "type" | "class"> & {
  id: string;
  label: string;
  description?: string;
};

export function Checkbox({ id, label, description, ...props }: CheckboxProps) {
  return (
    <label class="ui-checkbox" for={id}>
      <input {...props} class="ui-checkbox__input" id={id} type="checkbox" />
      <span class="ui-checkbox__copy">
        <span class="ui-checkbox__label">{label}</span>
        {description ? <span class="ui-checkbox__description">{description}</span> : null}
      </span>
    </label>
  );
}

type TabItem = {
  id: string;
  label: string;
  disabled?: boolean;
};

type TabsProps = {
  id: string;
  label: string;
  tabs: readonly TabItem[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function Tabs({ id, label, tabs, selectedId, onSelect }: TabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveFocus = (currentIndex: number, direction: 1 | -1) => {
    const enabled = tabs.map((tab, index) => (tab.disabled ? -1 : index)).filter((index) => index >= 0);
    if (enabled.length === 0) return;
    const enabledPosition = enabled.indexOf(currentIndex);
    const nextPosition = (enabledPosition + direction + enabled.length) % enabled.length;
    const nextIndex = enabled[nextPosition];
    if (nextIndex === undefined) return;
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;
    refs.current[nextIndex]?.focus();
    onSelect(nextTab.id);
  };

  return (
    <div class="ui-tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, index) => {
        const selected = tab.id === selectedId;
        return (
          <button
            class="ui-tabs__tab"
            id={`${id}-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${id}-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            disabled={tab.disabled}
            ref={(node) => {
              refs.current[index] = node;
            }}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                moveFocus(index, 1);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                moveFocus(index, -1);
              } else if (event.key === "Home") {
                event.preventDefault();
                const first = tabs.findIndex((item) => !item.disabled);
                const firstTab = tabs[first];
                if (firstTab) {
                  refs.current[first]?.focus();
                  onSelect(firstTab.id);
                }
              } else if (event.key === "End") {
                event.preventDefault();
                const last = tabs.findLastIndex((item) => !item.disabled);
                const lastTab = tabs[last];
                if (lastTab) {
                  refs.current[last]?.focus();
                  onSelect(lastTab.id);
                }
              }
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

type TabPanelProps = {
  tabsId: string;
  tabId: string;
  selected: boolean;
  children: ComponentChildren;
};

export function TabPanel({ tabsId, tabId, selected, children }: TabPanelProps) {
  return (
    <section
      class="ui-tab-panel"
      id={`${tabsId}-panel-${tabId}`}
      role="tabpanel"
      aria-labelledby={`${tabsId}-tab-${tabId}`}
      hidden={!selected}
    >
      {children}
    </section>
  );
}

type SurfaceProps = {
  kind?: "panel" | "card" | "inset";
  children: ComponentChildren;
  className?: string;
};

export function Surface({ kind = "panel", children, className }: SurfaceProps) {
  return <div class={cx("ui-surface", `ui-surface--${kind}`, className)}>{children}</div>;
}

export function Divider() {
  return <hr class="ui-divider" />;
}

type SectionHeadingProps = {
  title: string;
  description?: string;
  actions?: ComponentChildren;
};

export function SectionHeading({ title, description, actions }: SectionHeadingProps) {
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
  return (
    <div class="ui-toolbar" role="toolbar" aria-label={label}>
      {children}
    </div>
  );
}

export function ActionGroup({ children }: { children: ComponentChildren }) {
  return <div class="ui-action-group">{children}</div>;
}

export function List({ children, label }: { children: ComponentChildren; label?: string }) {
  return (
    <ul class="ui-list" aria-label={label}>
      {children}
    </ul>
  );
}

export function DataTable({ children, label }: { children: ComponentChildren; label: string }) {
  return (
    <div class="ui-table-frame">
      <table class="ui-table" aria-label={label}>
        {children}
      </table>
    </div>
  );
}

export function Chip({ children, accent = false }: { children: ComponentChildren; accent?: boolean }) {
  return <span class={cx("ui-chip", accent && "ui-chip--accent")}>{children}</span>;
}

export function Spinner({ label, size = "normal" }: { label: string; size?: "small" | "normal" }) {
  return (
    <span class={cx("ui-spinner", size === "small" && "ui-spinner--small")} role="status">
      <span class="ui-spinner__mark" aria-hidden="true" />
      <span class="ui-visually-hidden">{label}</span>
    </span>
  );
}

export function ProgressBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  return (
    <label class="ui-progress">
      <span>{label}</span>
      <progress max={max} value={value} />
      <span class="ui-progress__value">
        {value} / {max}
      </span>
    </label>
  );
}

type StateMessageProps = {
  title: string;
  children: ComponentChildren;
  tone?: "neutral" | "unavailable" | "error";
  action?: ComponentChildren;
};

export function StateMessage({ title, children, tone = "neutral", action }: StateMessageProps) {
  return (
    <div class={cx("ui-state-message", `ui-state-message--${tone}`)} role={tone === "error" ? "alert" : undefined}>
      <strong>{title}</strong>
      <span>{children}</span>
      {action ? <div class="ui-state-message__action">{action}</div> : null}
    </div>
  );
}

type DialogProps = {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ComponentChildren;
  actions?: ComponentChildren;
  placement?: "modal" | "drawer";
};

export function Dialog({
  id,
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  placement = "modal",
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      restoreFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      queueMicrotask(() => {
        const target = dialog.querySelector<HTMLElement>(
          "[data-autofocus], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)",
        );
        target?.focus();
      });
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
      const restoreTarget = restoreFocusRef.current;
      restoreFocusRef.current = null;
      queueMicrotask(() => restoreTarget?.focus());
    }
  }, [open]);

  useEffect(
    () => () => {
      restoreFocusRef.current?.focus();
    },
    [],
  );

  return (
    <dialog
      id={id}
      class={cx("ui-dialog", placement === "drawer" && "ui-dialog--drawer")}
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
    >
      <div class="ui-dialog__header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <IconButton label="Close dialog" icon="×" variant="quiet" onClick={() => onOpenChange(false)} />
      </div>
      <div class="ui-dialog__body">{children}</div>
      {actions ? <div class="ui-dialog__actions">{actions}</div> : null}
    </dialog>
  );
}
