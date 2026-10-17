import { describe, expect, it } from "vitest";
import { parseFantasiaAuthRedirect } from "../../apps/web/src/backend/supabase.js";

describe("Fantasia auth redirect parsing", () => {
  it("ignores ordinary application URLs", () => {
    expect(parseFantasiaAuthRedirect("https://fantasia.example/game")).toEqual({ handled: false });
  });

  it("parses a successful Supabase confirmation fragment", () => {
    expect(
      parseFantasiaAuthRedirect(
        "https://fantasia.example/#access_token=access-123&refresh_token=refresh-456&expires_in=3600&token_type=bearer&type=signup",
      ),
    ).toEqual({
      handled: true,
      accessToken: "access-123",
      refreshToken: "refresh-456",
      expiresAt: expect.any(Number),
    });
  });

  it("surfaces a failed confirmation fragment without treating it as a session", () => {
    expect(
      parseFantasiaAuthRedirect(
        "https://fantasia.example/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
      ),
    ).toEqual({
      handled: true,
      error: "Email link is invalid or has expired",
    });
  });
});
