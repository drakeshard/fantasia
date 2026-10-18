import type { ComponentChildren, ComponentProps } from "preact";
import { useEffect, useId, useRef } from "preact/hooks";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type ButtonProps = Omit<ComponentProps<"button">, "class"> & {
  variant?: "primary" | "secondary" | "quiet";
  pending?: boolean;
  className?: string;
};

export function Button({
  variant = "secondary",
  pending = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      class={cx("ui-button", `ui-button--${variant}`, className)}
      disabled={Boolean(disabled || pending)}
      aria-busy={pending || undefined}
    >
      {pending ? <Spinner label="Working" /> : children}
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

type ChipProps = {
  children: ComponentChildren;
  accent?: boolean;
};

export function Chip({ children, accent = false }: ChipProps) {
  return <span class={cx("ui-chip", accent && "ui-chip--accent")}>{children}</span>;
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
      <span class="ui-field__message ui-field__message--error" id={`${id}-error`} role="alert">
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
    type?: "text" | "search" | "email" | "password";
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
        class="ui-control"
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
      <input {...props} id={id} type="checkbox" />
      <span class="ui-checkbox__box" aria-hidden="true" />
      <span class="ui-checkbox__copy">
        <strong>{label}</strong>
        {description ? <span>{description}</span> : null}
      </span>
    </label>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span class="ui-spinner" role="status" aria-label={label}>
      <span aria-hidden="true" />
    </span>
  );
}

type StateMessageProps = {
  title: string;
  tone?: "neutral" | "success" | "warning" | "error" | "unavailable";
  children: ComponentChildren;
};

export function StateMessage({ title, tone = "neutral", children }: StateMessageProps) {
  return (
    <div class={cx("ui-state-message", `ui-state-message--${tone}`)} role={tone === "error" ? "alert" : "status"}>
      <strong>{title}</strong>
      <div>{children}</div>
    </div>
  );
}

type Tab = {
  id: string;
  label: string;
  disabled?: boolean;
};

type TabsProps = {
  id: string;
  label: string;
  tabs: readonly Tab[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function Tabs({ id, label, tabs, selectedId, onSelect }: TabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const moveFocus = (index: number, direction: 1 | -1) => {
    let nextIndex = index;
    for (let attempts = 0; attempts < tabs.length; attempts += 1) {
      nextIndex = (nextIndex + direction + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];
      if (nextTab && !nextTab.disabled) {
        refs.current[nextIndex]?.focus();
        onSelect(nextTab.id);
        break;
      }
    }
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

type DataTableProps = {
  label: string;
  children: ComponentChildren;
};

export function DataTable({ label, children }: DataTableProps) {
  return (
    <div class="ui-data-table-wrap">
      <table class="ui-data-table" aria-label={label}>
        {children}
      </table>
    </div>
  );
}

type ProgressBarProps = {
  label: string;
  value: number;
  max?: number;
};

export function ProgressBar({ label, value, max = 100 }: ProgressBarProps) {
  return (
    <div class="ui-progress">
      <div class="ui-progress__copy">
        <span>{label}</span>
        <span>{Math.round((value / max) * 100)}%</span>
      </div>
      <progress max={max} value={value} aria-label={label} />
    </div>
  );
}

type DialogProps = {
  id?: string;
  open: boolean;
  title: string;
  description?: string;
  children: ComponentChildren;
  actions?: ComponentChildren;
  placement?: "dialog" | "drawer";
  onOpenChange: (open: boolean) => void;
};

export function Dialog({
  id,
  open,
  title,
  description,
  children,
  actions,
  placement = "dialog",
  onOpenChange,
}: DialogProps) {
  const generatedId = useId();
  const dialogId = id ?? generatedId;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      const autofocus = dialog.querySelector<HTMLElement>("[data-autofocus]");
      autofocus?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onClose = () => {
      if (open) onOpenChange(false);
      openerRef.current?.focus();
    };
    const onCancel = (event: Event) => {
      event.preventDefault();
      onOpenChange(false);
    };

    dialog.addEventListener("close", onClose);
    dialog.addEventListener("cancel", onCancel);
    return () => {
      dialog.removeEventListener("close", onClose);
      dialog.removeEventListener("cancel", onCancel);
    };
  }, [open, onOpenChange]);

  return (
    <dialog
      class={cx("ui-dialog", placement === "drawer" && "ui-dialog--drawer")}
      ref={dialogRef}
      aria-labelledby={`${dialogId}-title`}
      aria-describedby={description ? `${dialogId}-description` : undefined}
    >
      <div class="ui-dialog__surface">
        <header class="ui-dialog__header">
          <div>
            <h2 id={`${dialogId}-title`}>{title}</h2>
            {description ? <p id={`${dialogId}-description`}>{description}</p> : null}
          </div>
          <IconButton label="Close" icon="×" variant="quiet" onClick={() => onOpenChange(false)} />
        </header>
        <div class="ui-dialog__body">{children}</div>
        {actions ? <footer class="ui-dialog__actions">{actions}</footer> : null}
      </div>
    </dialog>
  );
}
