import { FantasiaBackendError } from "./supabase.js";

export const TRUSTED_PROFILE_DISPLAY_NAME_COMMAND = "profile.update_display_name" as const;

export interface TrustedProfileCommandResult {
  readonly command: typeof TRUSTED_PROFILE_DISPLAY_NAME_COMMAND;
  readonly idempotencyKey: string;
  readonly replayed: boolean;
  readonly result: {
    readonly accountId: string;
    readonly displayName: string;
    readonly revision: number;
    readonly createdAt: string;
    readonly updatedAt: string;
  };
}

function backendConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    throw new FantasiaBackendError(
      "Fantasia backend is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
      0,
    );
  }
  return { url: url.replace(/\/$/, ""), publishableKey };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseTrustedProfileCommandResponse(value: unknown): TrustedProfileCommandResult {
  if (!isRecord(value) || value.command !== TRUSTED_PROFILE_DISPLAY_NAME_COMMAND) {
    throw new FantasiaBackendError("Trusted command returned an invalid response.", 502);
  }
  const result = value.result;
  if (
    typeof value.idempotencyKey !== "string" ||
    typeof value.replayed !== "boolean" ||
    !isRecord(result) ||
    typeof result.accountId !== "string" ||
    typeof result.displayName !== "string" ||
    typeof result.revision !== "number" ||
    typeof result.createdAt !== "string" ||
    typeof result.updatedAt !== "string"
  ) {
    throw new FantasiaBackendError("Trusted command returned an invalid response.", 502);
  }

  return {
    command: TRUSTED_PROFILE_DISPLAY_NAME_COMMAND,
    idempotencyKey: value.idempotencyKey,
    replayed: value.replayed,
    result: {
      accountId: result.accountId,
      displayName: result.displayName,
      revision: result.revision,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    },
  };
}

async function parseError(response: Response): Promise<FantasiaBackendError> {
  let message = `${response.status} ${response.statusText}`.trim();
  try {
    const body = (await response.json()) as Record<string, unknown>;
    if (typeof body.message === "string" && body.message.trim()) message = body.message;
  } catch {
    // Preserve status text when no JSON error is available.
  }
  return new FantasiaBackendError(message, response.status);
}

export function createTrustedCommandIdempotencyKey(): string {
  return crypto.randomUUID();
}

export async function executeTrustedProfileDisplayName(
  accessToken: string,
  idempotencyKey: string,
  displayName: string,
): Promise<TrustedProfileCommandResult> {
  const config = backendConfig();
  const response = await fetch(`${config.url}/functions/v1/trusted-command`, {
    method: "POST",
    headers: {
      apikey: config.publishableKey,
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      type: TRUSTED_PROFILE_DISPLAY_NAME_COMMAND,
      idempotencyKey,
      payload: { displayName },
    }),
  });
  if (!response.ok) throw await parseError(response);
  return parseTrustedProfileCommandResponse(await response.json());
}
