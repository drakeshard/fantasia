import identityCatalog from "../../../../../config/identity-ui-assets.json";

export type IdentityUiAssetRole = {
  readonly id: string;
  readonly label: string;
  readonly family: string;
};

export type IdentityUiAssetOwner = {
  readonly semanticId: string;
  readonly displayName: string;
  readonly entityType: string;
  readonly roles: readonly string[];
  readonly visualStatus?: string;
  readonly decisionReference?: string;
};

type StudioOwnerOption = {
  readonly semanticId: string;
  readonly displayName: string;
  readonly entityType: string;
};

export const identityUiAssetRoles = identityCatalog.roles as readonly IdentityUiAssetRole[];
export const identityUiAssetOwners = identityCatalog.owners as readonly IdentityUiAssetOwner[];

export function identityUiRoleOptions(): readonly { value: string; label: string }[] {
  return identityUiAssetRoles.map((role) => ({ value: role.id, label: role.label }));
}

export function identityUiOwnersForRole(
  role: string,
  canonicalOwners: readonly StudioOwnerOption[],
): readonly StudioOwnerOption[] {
  const allowedIds = new Set(
    identityUiAssetOwners.filter((owner) => owner.roles.includes(role)).map((owner) => owner.semanticId),
  );
  return canonicalOwners.filter((owner) => allowedIds.has(owner.semanticId));
}

export function identityUiRoleLabel(role: string): string {
  return identityUiAssetRoles.find((candidate) => candidate.id === role)?.label ?? role;
}
