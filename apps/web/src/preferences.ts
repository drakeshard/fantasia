export const UI_PREFERENCES_STORAGE_KEY = "fantasia.ui-preferences.v1";
export const UI_PREFERENCES_VERSION = 1 as const;

export type InterfaceTextScale = 1 | 1.25 | 1.5 | 2;

export interface UiPreferences {
  readonly version: typeof UI_PREFERENCES_VERSION;
  readonly interfaceTextScale: InterfaceTextScale;
  readonly reduceMotion: boolean;
  readonly persistentLabels: boolean;
}

export interface UiPreferencesLoadResult {
  readonly preferences: UiPreferences;
  readonly storageAvailable: boolean;
  readonly message?: string;
}

export interface UiPreferencesWriteResult {
  readonly storageAvailable: boolean;
  readonly message?: string;
}

export const defaultUiPreferences = (): UiPreferences => ({
  version: UI_PREFERENCES_VERSION,
  interfaceTextScale: 1,
  reduceMotion: false,
  persistentLabels: true,
});

function isInterfaceTextScale(value: unknown): value is InterfaceTextScale {
  return value === 1 || value === 1.25 || value === 1.5 || value === 2;
}

function isUiPreferences(value: unknown): value is UiPreferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<UiPreferences>;
  return (
    candidate.version === UI_PREFERENCES_VERSION &&
    isInterfaceTextScale(candidate.interfaceTextScale) &&
    typeof candidate.reduceMotion === "boolean" &&
    typeof candidate.persistentLabels === "boolean"
  );
}

export function loadUiPreferences(storage: Storage | undefined): UiPreferencesLoadResult {
  const fallback = defaultUiPreferences();
  if (storage === undefined) {
    return {
      preferences: fallback,
      storageAvailable: false,
      message: "Interface preferences cannot be saved in this browser session. Defaults are in use.",
    };
  }

  try {
    const stored = storage.getItem(UI_PREFERENCES_STORAGE_KEY);
    if (stored === null) return { preferences: fallback, storageAvailable: true };
    const parsed: unknown = JSON.parse(stored);
    if (isUiPreferences(parsed)) return { preferences: parsed, storageAvailable: true };
    return {
      preferences: fallback,
      storageAvailable: true,
      message: "Saved interface preferences could not be read. Defaults are in use until you save or reset them.",
    };
  } catch {
    return {
      preferences: fallback,
      storageAvailable: false,
      message: "Interface preferences could not be read from browser storage. Defaults are in use.",
    };
  }
}

export function saveUiPreferences(
  storage: Storage | undefined,
  preferences: UiPreferences,
): UiPreferencesWriteResult {
  if (storage === undefined) {
    return {
      storageAvailable: false,
      message: "Interface preferences cannot be saved in this browser session. Changes apply only until reload.",
    };
  }

  try {
    storage.setItem(UI_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    return { storageAvailable: true };
  } catch {
    return {
      storageAvailable: false,
      message: "Interface preferences could not be saved. Changes apply only until reload.",
    };
  }
}

export function resetUiPreferences(storage: Storage | undefined): UiPreferencesWriteResult {
  if (storage === undefined) {
    return {
      storageAvailable: false,
      message: "Browser storage is unavailable. Defaults are restored for this session only.",
    };
  }

  try {
    storage.removeItem(UI_PREFERENCES_STORAGE_KEY);
    return { storageAvailable: true, message: "Interface preferences were reset to defaults." };
  } catch {
    return {
      storageAvailable: false,
      message: "Browser storage is unavailable. Defaults are restored for this session only.",
    };
  }
}

export function applyUiPreferences(preferences: UiPreferences) {
  const root = document.documentElement;
  root.style.setProperty("--ui-text-scale", String(preferences.interfaceTextScale));
  root.dataset.uiReduceMotion = preferences.reduceMotion ? "true" : "false";
  root.dataset.uiPersistentLabels = preferences.persistentLabels ? "true" : "false";
}
