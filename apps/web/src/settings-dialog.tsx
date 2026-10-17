import { useEffect, useRef } from "preact/hooks";
import {
  defaultUiPreferences,
  type InterfaceTextScale,
  type UiPreferences,
} from "./preferences.js";

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
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();

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
        aria-labelledby="settings-dialog-title"
      >
        <header class="settings-dialog-header">
          <div>
            <p class="hud-eyebrow">Interface preferences</p>
            <h2 id="settings-dialog-title">Settings</h2>
          </div>
          <button ref={closeRef} type="button" class="ui-button secondary" onClick={onClose}>
            Close
          </button>
        </header>

        <div class="settings-dialog-body">
          {account && onSignOut ? (
            <section class="settings-recovery settings-account" aria-label="Account">
              <strong>Account</strong>
              <p>{accountLabel}</p>
              {account.displayName && account.email ? <small>{account.email}</small> : null}
              <button
                type="button"
                class="ui-button secondary"
                onClick={onSignOut}
                disabled={signOutBusy}
              >
                {signOutBusy ? "Signing out…" : "Sign out"}
              </button>
            </section>
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
            <section class="settings-recovery" aria-live="polite">
              <strong>Preference storage</strong>
              <p>{storageMessage}</p>
              <button type="button" class="ui-button secondary" onClick={onRetryStorage}>
                Retry storage
              </button>
            </section>
          ) : null}
        </div>

        <footer class="settings-dialog-footer">
          <button type="button" class="ui-button secondary" onClick={onReset}>
            Reset to defaults
          </button>
          <button type="button" class="ui-button primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
