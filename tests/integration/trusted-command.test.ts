import { describe, expect, it } from "vitest";
import { parseTrustedProfileCommandResponse } from "../../apps/web/src/backend/commands.ts";
import {
  parseTrustedCommandRequest,
  TRUSTED_PROFILE_DISPLAY_NAME_COMMAND,
} from "../../supabase/functions/trusted-command/contract.ts";

describe("GAME-BACKEND05 trusted command contract", () => {
  it("normalizes the approved profile display-name proof command", () => {
    expect(
      parseTrustedCommandRequest({
        type: TRUSTED_PROFILE_DISPLAY_NAME_COMMAND,
        idempotencyKey: "  request-123456  ",
        payload: { displayName: "  Rookie  " },
      }),
    ).toEqual({
      type: TRUSTED_PROFILE_DISPLAY_NAME_COMMAND,
      idempotencyKey: "request-123456",
      payload: { displayName: "Rookie" },
    });
  });

  it("rejects unsupported commands, malformed idempotency keys, and invalid names", () => {
    expect(() =>
      parseTrustedCommandRequest({ type: "talent.purchase", idempotencyKey: "request-123456", payload: {} }),
    ).toThrow(/Unsupported trusted command/);
    expect(() =>
      parseTrustedCommandRequest({
        type: TRUSTED_PROFILE_DISPLAY_NAME_COMMAND,
        idempotencyKey: "short",
        payload: { displayName: "Rookie" },
      }),
    ).toThrow(/Idempotency key/);
    expect(() =>
      parseTrustedCommandRequest({
        type: TRUSTED_PROFILE_DISPLAY_NAME_COMMAND,
        idempotencyKey: "request-123456",
        payload: { displayName: " ".repeat(2) },
      }),
    ).toThrow(/Display name/);
  });

  it("parses first-execution and replay responses without changing the stored result", () => {
    const first = parseTrustedProfileCommandResponse({
      command: TRUSTED_PROFILE_DISPLAY_NAME_COMMAND,
      idempotencyKey: "request-123456",
      replayed: false,
      result: {
        accountId: "account-1",
        displayName: "Rookie",
        revision: 3,
        createdAt: "2026-10-17T00:00:00Z",
        updatedAt: "2026-10-17T00:01:00Z",
      },
    });
    const replay = parseTrustedProfileCommandResponse({ ...first, replayed: true });

    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.result).toEqual(first.result);
  });

  it("rejects malformed command responses", () => {
    expect(() =>
      parseTrustedProfileCommandResponse({
        command: TRUSTED_PROFILE_DISPLAY_NAME_COMMAND,
        idempotencyKey: "request-123456",
        replayed: false,
        result: { accountId: "account-1" },
      }),
    ).toThrow(/invalid response/);
  });
});
