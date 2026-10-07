import {
  EnvelopeSaveService,
  type JsonValue,
  SaveMigrationRegistry,
  type SaveService,
  type SaveStorage,
  type SaveTimestamp,
} from "@drakeshard/foundation/storage";

export const FANTASIA_GAME_ID = "fantasia" as const;
export const FANTASIA_SAVE_FORMAT_VERSION = 1;

export interface FantasiaSaveServiceOptions {
  readonly storage: SaveStorage;
  readonly gameVersion: string;
  readonly contentVersion: string;
  readonly now: () => SaveTimestamp;
}

export function createFantasiaSaveService<TPayload extends JsonValue>(
  options: FantasiaSaveServiceOptions,
): SaveService<TPayload> {
  return new EnvelopeSaveService<TPayload>({
    storage: options.storage,
    gameId: FANTASIA_GAME_ID,
    saveFormatVersion: FANTASIA_SAVE_FORMAT_VERSION,
    gameVersion: options.gameVersion,
    contentVersion: options.contentVersion,
    migrations: new SaveMigrationRegistry([]),
    now: options.now,
  });
}
