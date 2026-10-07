import type {
  PersistenceResult,
  SaveSlotId,
  SaveStorage,
} from "@drakeshard/foundation/storage";
import { describe, expect, it } from "vitest";
import {
  createFantasiaSaveService,
  FANTASIA_SAVE_FORMAT_VERSION,
} from "../../packages/runtime/src/index.ts";

class MemorySaveStorage implements SaveStorage {
  readonly records = new Map<SaveSlotId, string>();

  async read(slotId: SaveSlotId): Promise<PersistenceResult<string | null>> {
    return { ok: true, value: this.records.get(slotId) ?? null };
  }

  async write(slotId: SaveSlotId, serialized: string): Promise<PersistenceResult<void>> {
    this.records.set(slotId, serialized);
    return { ok: true, value: undefined };
  }

  async delete(slotId: SaveSlotId): Promise<PersistenceResult<boolean>> {
    return { ok: true, value: this.records.delete(slotId) };
  }

  async list(): Promise<PersistenceResult<readonly SaveSlotId[]>> {
    return { ok: true, value: [...this.records.keys()].sort() };
  }
}

describe("GAME-I01 Foundation persistence boundary", () => {
  it("round-trips a game-owned JSON payload through a Foundation save envelope", async () => {
    const storage = new MemorySaveStorage();
    const saves = createFantasiaSaveService({
      storage,
      gameVersion: "0.0.0",
      contentVersion: "test-content-v1",
      now: () => "2026-10-07T00:00:00.000Z",
    });
    const payload = {
      schemaVersion: 1,
      session: { tick: 12, marker: "foundation-integration" },
    } as const;

    expect(await saves.save("slot-a", payload)).toEqual({ ok: true, value: undefined });
    expect(await saves.load("slot-a")).toEqual({ ok: true, value: payload });

    const serialized = storage.records.get("slot-a");
    expect(serialized).toBeDefined();
    expect(JSON.parse(serialized ?? "{}")).toMatchObject({
      gameId: "fantasia",
      saveFormatVersion: FANTASIA_SAVE_FORMAT_VERSION,
      gameVersion: "0.0.0",
      contentVersion: "test-content-v1",
    });
  });
});
