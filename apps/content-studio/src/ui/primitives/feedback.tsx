import type { ComponentChildren } from "preact";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
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
      <span class="ui-progress__value">{value} / {max}</span>
    </label>
  );
}

export type StateMessageTone = "neutral" | "unavailable" | "error";

export function StateMessage({
  title,
  children,
  tone = "neutral",
  action,
}: {
  title: string;
  children: ComponentChildren;
  tone?: StateMessageTone;
  action?: ComponentChildren;
}) {
  return (
    <div
      class={cx("ui-state-message", `ui-state-message--${tone}`)}
      role={tone === "error" ? "alert" : undefined}
    >
      <strong>{title}</strong>
      <span>{children}</span>
      {action ? <div class="ui-state-message__action">{action}</div> : null}
    </div>
  );
}
