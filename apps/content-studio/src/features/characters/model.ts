import type { DashboardEntityReadModel, StudioReadModelsResponse } from "../../dashboard-model";

export type CharacterCanonical = {
  readonly canonicalPath: string;
  readonly canonicalData: Readonly<Record<string, unknown>>;
  readonly provenance: { readonly revision?: string };
};

export type CharacterReadModel = DashboardEntityReadModel & {
  readonly canonical: CharacterCanonical;
  readonly schemaVersion: number | null;
  readonly relations: readonly {
    readonly type: string;
    readonly targetSemanticId: string;
    readonly valid: boolean;
  }[];
  readonly history: readonly {
    readonly eventType: string;
    readonly occurredAt: string;
    readonly sourceKind: string | null;
  }[];
};

export type CharacterDomainData = {
  readonly canonical: Readonly<Record<string, unknown>>;
  readonly rpg: Readonly<Record<string, unknown>>;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly hp: Readonly<Record<string, unknown>>;
};

function recordValue(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function characterModels(response: StudioReadModelsResponse): readonly CharacterReadModel[] {
  return response.models.filter(
    (model) => model.entityType === "character",
  ) as unknown as readonly CharacterReadModel[];
}

export function characterDomainData(model: CharacterReadModel): CharacterDomainData {
  const canonical = model.canonical.canonicalData;
  const rpg = recordValue(canonical.rpg);
  return {
    canonical,
    rpg,
    attributes: recordValue(rpg.attributes),
    hp: recordValue(rpg.hp),
  };
}
