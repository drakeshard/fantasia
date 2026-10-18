import { describe, expect, it } from "vitest";
import identityCatalog from "../../config/identity-ui-assets.json";
import {
  identityUiOwnersForRole,
  identityUiRoleLabel,
  identityUiRoleOptions,
} from "../../apps/content-studio/src/features/assets/identity-ui-catalog.ts";

describe("Identity/UI asset catalog", () => {
  it("exposes the controlled first-slice asset types", () => {
    expect(identityUiRoleOptions().map((option) => option.value)).toEqual([
      "brand-crest",
      "brand-wordmark",
      "faction-rule-emblem",
      "faction-playstyle-emblem",
      "class-icon",
      "element-icon",
      "stat-icon",
      "equipment-slot-icon",
      "equipment-family-icon",
      "identity-plate",
    ]);
    expect(identityUiRoleLabel("faction-playstyle-emblem")).toBe("Faction Playstyle Emblem");
  });

  it("filters owners by asset type instead of permitting arbitrary combinations", () => {
    const canonicalOwners = identityCatalog.owners.map((owner) => ({
      semanticId: owner.semanticId,
      displayName: owner.displayName,
      entityType: owner.entityType,
    }));
    const playstyles = identityUiOwnersForRole("faction-playstyle-emblem", canonicalOwners);
    expect(playstyles).toHaveLength(11);
    expect(playstyles.map((owner) => owner.displayName)).toContain("Predator");
    expect(playstyles.map((owner) => owner.displayName)).not.toContain("Lancer");

    const classes = identityUiOwnersForRole("class-icon", canonicalOwners);
    expect(classes).toHaveLength(11);
    expect(classes.map((owner) => owner.displayName)).toContain("Lancer");
    expect(classes.map((owner) => owner.displayName)).not.toContain("Predator");
  });

  it("keeps the standardized playstyle backplate separate from playstyle emblems", () => {
    const plate = identityCatalog.owners.find(
      (owner) => owner.semanticId === "identity-plate.faction-playstyle.standard",
    );
    expect(plate?.roles).toEqual(["identity-plate"]);
    expect(plate?.visualStatus).toBe("FROZEN");
    expect(
      identityCatalog.owners.find((owner) => owner.semanticId === "faction-playstyle.predator")?.roles,
    ).toEqual(["faction-playstyle-emblem"]);
  });
});
