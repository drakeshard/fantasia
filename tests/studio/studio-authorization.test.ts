import { describe, expect, it } from "vitest";
import {
  capabilitiesForRole,
  parseStudioOperationRequest,
  STUDIO_MEMBERSHIP_SET,
  STUDIO_ROLES,
} from "../../supabase/functions/studio-operations/contract";

describe("Studio authorization contract", () => {
  it("uses exactly the frozen four roles", () => {
    expect(STUDIO_ROLES).toEqual(["Viewer", "Editor", "Approver", "Admin"]);
  });

  it("keeps proposal, approval, and administration capabilities distinct", () => {
    expect(capabilitiesForRole("Viewer")).toEqual(["studio.read"]);
    expect(capabilitiesForRole("Viewer")).not.toContain("canonical.change.propose");
    expect(capabilitiesForRole("Editor")).toEqual([
      "studio.read",
      "registry.metadata.edit",
      "canonical.change.propose",
    ]);
    expect(capabilitiesForRole("Approver")).toContain("canonical.change.propose");
    expect(capabilitiesForRole("Approver")).toContain("review.approve");
    expect(capabilitiesForRole("Approver")).toContain("review.freeze");
    expect(capabilitiesForRole("Approver")).not.toContain("studio.membership.manage");
    expect(capabilitiesForRole("Admin")).toContain("canonical.change.propose");
    expect(capabilitiesForRole("Admin")).toContain("studio.membership.manage");
    expect(capabilitiesForRole("Admin")).not.toContain("review.approve");
    expect(capabilitiesForRole("Admin")).not.toContain("review.freeze");
  });

  it("does not accept browser-supplied actor or capability claims", () => {
    expect(() =>
      parseStudioOperationRequest({
        type: STUDIO_MEMBERSHIP_SET,
        idempotencyKey: "test-key-123",
        actorUserId: "00000000-0000-4000-8000-000000000001",
        payload: {
          userId: "00000000-0000-4000-8000-000000000002",
          role: "Admin",
          active: true,
        },
      }),
    ).toThrow("unsupported fields");

    expect(() =>
      parseStudioOperationRequest({
        type: STUDIO_MEMBERSHIP_SET,
        idempotencyKey: "test-key-123",
        capabilities: ["studio.membership.manage"],
        payload: {
          userId: "00000000-0000-4000-8000-000000000002",
          role: "Admin",
          active: true,
        },
      }),
    ).toThrow("unsupported fields");
  });
});
