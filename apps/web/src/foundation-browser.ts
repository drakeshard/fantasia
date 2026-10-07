import {
  MonotonicInputSequence,
  type PhysicalInputEvent,
} from "@drakeshard/foundation/input";
import {
  BrowserInputLifecycle,
  KeyboardBrowserAdapter,
} from "@drakeshard/foundation/input/browser";
import {
  IndexedDbSaveStorage,
} from "@drakeshard/foundation/storage/browser";
import type { JsonValue, SaveService } from "@drakeshard/foundation/storage";
import {
  createFantasiaSaveService,
  type FantasiaRuntimeSession,
} from "@fantasia/runtime";

export interface BrowserInputBinding {
  attach(): void;
  detach(): void;
}

export function createBrowserInputBinding(session: FantasiaRuntimeSession): BrowserInputBinding {
  const sequence = new MonotonicInputSequence();
  const sink = (event: PhysicalInputEvent): void => session.ingestPhysicalInput(event);

  const lifecycle = new BrowserInputLifecycle({
    focusTarget: window,
    visibilityTarget: document,
    sequence,
    sink,
  });
  const keyboard = new KeyboardBrowserAdapter({
    keyboardTarget: window,
    lifecycle,
    sequence,
    sink,
  });
  const unsubscribeReset = lifecycle.subscribeReset(() => session.resetTiming());

  return {
    attach(): void {
      lifecycle.attach();
      keyboard.attach();
    },
    detach(): void {
      lifecycle.detach();
      keyboard.detach();
      unsubscribeReset();
    },
  };
}

export interface BrowserSaveServiceOptions {
  readonly gameVersion: string;
  readonly contentVersion: string;
  readonly databaseName?: string;
}

export function createBrowserSaveService<TPayload extends JsonValue>(
  options: BrowserSaveServiceOptions,
): SaveService<TPayload> {
  return createFantasiaSaveService<TPayload>({
    storage: new IndexedDbSaveStorage({ databaseName: options.databaseName ?? "fantasia" }),
    gameVersion: options.gameVersion,
    contentVersion: options.contentVersion,
    now: () => new Date().toISOString(),
  });
}
