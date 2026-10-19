import type { ComponentChildren, ComponentProps } from "preact";
import { Spinner } from "./feedback";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type ButtonProps = Omit<ComponentProps<"button">, "class" | "className"> & {
  variant?: "primary" | "secondary" | "quiet";
  pending?: boolean;
  /** Shared-layer hook only. Production feature code is statically forbidden from supplying this. */
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

export type IconButtonProps = Omit<ButtonProps, "children"> & {
  label: string;
  icon: ComponentChildren;
};

export function IconButton({ label, icon, className, ...props }: IconButtonProps) {
  return (
    <Button {...props} className={cx("ui-icon-button", className)} aria-label={label}>
      <span aria-hidden="true">{icon}</span>
    </Button>
  );
}
