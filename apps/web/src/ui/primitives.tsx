import type { ComponentChildren, JSX } from "preact";

export type UiButtonTone = "neutral" | "primary" | "quiet" | "danger";
export type UiPanelTone = "default" | "raised" | "overlay";
export type UiBadgeTone = "neutral" | "positive" | "warning" | "danger" | "info";
export type UiFeedbackTone = "loading" | "empty" | "error" | "info";

interface UiButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "class" | "className"> {
  readonly children: ComponentChildren;
  readonly class?: string;
  readonly tone?: UiButtonTone;
  readonly busy?: boolean;
  readonly selected?: boolean;
}

export function UiButton({
  children,
  class: className,
  tone = "neutral",
  busy = false,
  selected,
  disabled,
  type = "button",
  ...buttonProps
}: UiButtonProps) {
  const classes = [
    "ui-primitive-button",
    `ui-primitive-button-${tone}`,
    selected ? "is-selected" : "",
    busy ? "is-busy" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      {...buttonProps}
      type={type}
      class={classes}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...(selected === undefined ? {} : { "aria-pressed": selected })}
    >
      <span class="ui-primitive-button-content">{children}</span>
      {busy ? <span class="ui-primitive-busy-mark" aria-hidden="true" /> : null}
    </button>
  );
}

interface UiIconButtonProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "class" | "className" | "children"> {
  readonly label: string;
  readonly icon: ComponentChildren;
  readonly class?: string;
  readonly tone?: UiButtonTone;
  readonly busy?: boolean;
  readonly selected?: boolean;
}

export function UiIconButton({
  label,
  icon,
  class: className,
  tone = "quiet",
  busy,
  selected,
  ...buttonProps
}: UiIconButtonProps) {
  return (
    <UiButton
      {...buttonProps}
      class={`ui-primitive-icon-button${className ? ` ${className}` : ""}`}
      tone={tone}
      {...(busy === undefined ? {} : { busy })}
      {...(selected === undefined ? {} : { selected })}
      aria-label={label}
    >
      <span class="ui-primitive-icon-slot" aria-hidden="true">
        {icon}
      </span>
    </UiButton>
  );
}

interface UiPanelProps {
  readonly children: ComponentChildren;
  readonly class?: string;
  readonly tone?: UiPanelTone;
  readonly ariaLabel?: string;
}

export function UiPanel({ children, class: className, tone = "default", ariaLabel }: UiPanelProps) {
  return (
    <section
      class={`ui-primitive-panel ui-primitive-panel-${tone}${className ? ` ${className}` : ""}`}
      {...(ariaLabel ? { "aria-label": ariaLabel } : {})}
    >
      {children}
    </section>
  );
}

interface UiTitleLockupProps {
  readonly eyebrow?: string;
  readonly title: string;
  readonly detail?: string;
  readonly ornament?: ComponentChildren;
  readonly align?: "start" | "center";
  readonly class?: string;
}

export function UiTitleLockup({
  eyebrow,
  title,
  detail,
  ornament,
  align = "start",
  class: className,
}: UiTitleLockupProps) {
  return (
    <div class={`ui-title-lockup ui-title-lockup-${align}${className ? ` ${className}` : ""}`}>
      {ornament ? (
        <span class="ui-title-lockup-ornament" aria-hidden="true">
          {ornament}
        </span>
      ) : null}
      <div class="ui-title-lockup-copy">
        {eyebrow ? <span class="ui-title-lockup-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {detail ? <p>{detail}</p> : null}
      </div>
    </div>
  );
}

export function UiDivider({ label }: { readonly label?: string }) {
  return (
    <div class="ui-divider" {...(label ? { role: "separator", "aria-label": label } : {})}>
      <span aria-hidden="true" />
      {label ? <strong>{label}</strong> : null}
      <span aria-hidden="true" />
    </div>
  );
}

interface UiBadgeProps {
  readonly children: ComponentChildren;
  readonly tone?: UiBadgeTone;
  readonly class?: string;
}

export function UiBadge({ children, tone = "neutral", class: className }: UiBadgeProps) {
  return (
    <span class={`ui-badge ui-badge-${tone}${className ? ` ${className}` : ""}`}>{children}</span>
  );
}

interface UiFeedbackProps {
  readonly title: string;
  readonly detail?: string;
  readonly tone?: UiFeedbackTone;
  readonly action?: ComponentChildren;
}

export function UiFeedback({ title, detail, tone = "info", action }: UiFeedbackProps) {
  const liveRole = tone === "error" ? "alert" : "status";
  return (
    <div class={`ui-feedback ui-feedback-${tone}`} role={liveRole}>
      <span class="ui-feedback-mark" aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        {detail ? <p>{detail}</p> : null}
      </div>
      {action ? <div class="ui-feedback-action">{action}</div> : null}
    </div>
  );
}

interface UiSelectableRowProps
  extends Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "class" | "className" | "children"> {
  readonly title: string;
  readonly detail?: string;
  readonly leading?: ComponentChildren;
  readonly trailing?: ComponentChildren;
  readonly selected?: boolean;
  readonly class?: string;
}

export function UiSelectableRow({
  title,
  detail,
  leading,
  trailing,
  selected = false,
  class: className,
  ...buttonProps
}: UiSelectableRowProps) {
  return (
    <button
      {...buttonProps}
      type="button"
      class={`ui-selectable-row${selected ? " is-selected" : ""}${className ? ` ${className}` : ""}`}
      aria-pressed={selected}
    >
      {leading ? (
        <span class="ui-selectable-row-leading" aria-hidden="true">
          {leading}
        </span>
      ) : null}
      <span class="ui-selectable-row-copy">
        <strong>{title}</strong>
        {detail ? <small>{detail}</small> : null}
      </span>
      {trailing ? <span class="ui-selectable-row-trailing">{trailing}</span> : null}
    </button>
  );
}

interface UiArtFrameProps {
  readonly children: ComponentChildren;
  readonly label?: string;
  readonly class?: string;
}

export function UiArtFrame({ children, label, class: className }: UiArtFrameProps) {
  return (
    <figure class={`ui-art-frame${className ? ` ${className}` : ""}`}>
      <div class="ui-art-frame-content">{children}</div>
      {label ? <figcaption>{label}</figcaption> : null}
    </figure>
  );
}

interface UiHudStripProps {
  readonly children: ComponentChildren;
  readonly class?: string;
  readonly ariaLabel?: string;
}

export function UiHudStrip({ children, class: className, ariaLabel }: UiHudStripProps) {
  return (
    <div
      class={`ui-hud-strip${className ? ` ${className}` : ""}`}
      {...(ariaLabel ? { role: "group", "aria-label": ariaLabel } : {})}
    >
      {children}
    </div>
  );
}
