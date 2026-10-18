import { describe, expect, it } from "vitest";
import {
  createFantasiaSaveService,
  FANTASIA_SAVE_FORMAT_VERSION,
} from "../../packages/runtime/src/index.ts";

class MemorySaveStorage {
  readonly records = new Map<string, string>();

  async read(slotId: string) {
    return { ok: true as const, value: this.records.get(slotId) ?? null };
  }

  async write(slotId: string, serialized: string) {
    this.records.set(slotId, serialized);
    return { ok: true as const, value: undefined };
  }

  async delete(slotId: string) {
    return { ok: true as const, value: this.records.delete(slotId) };
  }

  async list() {
    return { ok: true as const, value: [...this.records.keys()].sort() };
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
