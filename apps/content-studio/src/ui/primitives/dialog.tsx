import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { IconButton } from "./button";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Dialog({
  id,
  open,
  onOpenChange,
  title,
  description,
  children,
  actions,
  placement = "modal",
}: {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ComponentChildren;
  actions?: ComponentChildren;
  placement?: "modal" | "drawer";
}) {
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
        dialog.querySelector<HTMLElement>("[data-autofocus], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)")?.focus();
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

  useEffect(() => () => restoreFocusRef.current?.focus(), []);

  return (
    <dialog
      id={id}
      class={cx("ui-dialog", placement === "drawer" && "ui-dialog--drawer")}
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => { event.preventDefault(); onOpenChange(false); }}
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
