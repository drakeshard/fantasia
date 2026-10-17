import { useEffect, useRef } from "preact/hooks";
import {
  defaultUiPreferences,
  type InterfaceTextScale,
  type UiPreferences,
} from "./preferences.js";
import { UiButton, UiPanel, UiTitleLockup } from "./ui/primitives.js";

interface SettingsAccount {
  readonly displayName: string | null;
  readonly email?: string;
}

interface SettingsDialogProps {
  readonly open: boolean;
  readonly preferences: UiPreferences;
  readonly storageMessage?: string;
  readonly account?: SettingsAccount;
  readonly signOutBusy?: boolean;
  readonly onSignOut?: () => void;
  readonly onChange: (preferences: UiPreferences) => void;
  readonly onReset: () => void;
  readonly onRetryStorage: () => void;
  readonly onClose: () => void;
}

const textScaleOptions: readonly Readonly<{ value: InterfaceTextScale; label: string }>[] = [
  { value: 1, label: "Normal — 100%" },
  { value: 1.25, label: "Large — 125%" },
  { value: 1.5, label: "Larger — 150%" },
  { value: 2, label: "Extra large — 200%" },
];

export function SettingsDialog({
  open,
  preferences,
  storageMessage,
  account,
  signOutBusy = false,
  onSignOut,
  onChange,
  onReset,
  onRetryStorage,
  onClose,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.querySelector<HTMLElement>("[data-settings-close]")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled), select:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function update(next: Partial<UiPreferences>) {
    onChange({ ...preferences, ...next, version: defaultUiPreferences().version });
  }

  const accountLabel = account?.displayName?.trim() || account?.email || "Fantasia account";

  return (
    <div class="settings-backdrop" role="presentation">
      <div
        ref={dialogRef}
        class="settings-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <header class="settings-dialog-header">
          <UiTitleLockup
            class="settings-title-lockup"
            eyebrow="Interface preferences"
            title="Settings"
            detail="Adjust how Fantasia presents information on this device."
          />
          <UiButton data-settings-close tone="quiet" onClick={onClose}>
            Close
          </UiButton>
        </header>

        <div class="settings-dialog-body">
          {account && onSignOut ? (
            <UiPanel class="settings-recovery settings-account" tone="raised" ariaLabel="Account">
              <div class="settings-panel-copy">
                <strong>Account</strong>
                <p>{accountLabel}</p>
                {account.displayName && account.email ? <small>{account.email}</small> : null}
              </div>
              <UiButton tone="neutral" busy={signOutBusy} onClick={onSignOut}>
                {signOutBusy ? "Signing out…" : "Sign out"}
              </UiButton>
            </UiPanel>
          ) : null}

          <label class="settings-row" for="interface-text-scale">
            <span>
              <strong>Interface text</strong>
              <small>Changes interface text independently from campaign map zoom.</small>
            </span>
            <select
              id="interface-text-scale"
              value={String(preferences.interfaceTextScale)}
              onChange={(event) =>
                update({
                  interfaceTextScale: Number(event.currentTarget.value) as InterfaceTextScale,
                })
              }
            >
              {textScaleOptions.map((option) => (
                <option value={String(option.value)}>{option.label}</option>
              ))}
            </select>
          </label>

          <label class="settings-row toggle-row">
            <span>
              <strong>Reduce motion</strong>
              <small>
                Removes interface travel and scale animation. System reduced-motion is always
                honored.
              </small>
            </span>
            <input
              type="checkbox"
              checked={preferences.reduceMotion}
              onChange={(event) => update({ reduceMotion: event.currentTarget.checked })}
            />
          </label>

          <label class="settings-row toggle-row">
            <span>
              <strong>Persistent map labels</strong>
              <small>
                Keep campaign stage labels visible at rest. Selected, current, focused and listed
                stages remain named either way.
              </small>
            </span>
            <input
              type="checkbox"
              checked={preferences.persistentLabels}
              onChange={(event) => update({ persistentLabels: event.currentTarget.checked })}
            />
          </label>

          {storageMessage ? (
            <UiPanel class="settings-recovery" tone="overlay" ariaLabel="Preference storage">
              <div class="settings-panel-copy">
                <strong>Preference storage</strong>
                <p>{storageMessage}</p>
              </div>
              <UiButton tone="neutral" onClick={onRetryStorage}>
                Retry storage
              </UiButton>
            </UiPanel>
          ) : null}
        </div>

        <footer class="settings-dialog-footer">
          <UiButton tone="quiet" onClick={onReset}>
            Reset to defaults
          </UiButton>
          <UiButton tone="primary" onClick={onClose}>
            Done
          </UiButton>
        </footer>
      </div>
    </div>
  );
}
