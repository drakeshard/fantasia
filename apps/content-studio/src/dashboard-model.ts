export type DashboardTargetModule =
  | "dashboard"
  | "characters"
  | "equipment"
  | "skills"
  | "story"
  | "maps-encounters"
  | "enemies"
  | "assets"
  | "releases";

export interface DashboardEntityReadModel {
  readonly semanticId: string;
  readonly entityType: string;
  readonly displayName: string;
  readonly lifecycle: string | null;
  readonly validations: readonly {
    readonly dimension: string;
    readonly outcome: string;
    readonly blocking: boolean;
  }[];
  readonly provenance: readonly {
    readonly authority: string;
    readonly observedAt?: string;
  }[];
  readonly issues: readonly {
    readonly code: string;
    readonly severity: string;
    readonly message: string;
  }[];
  readonly assets: readonly {
    readonly semanticId: string;
    readonly role: string;
    readonly variant: string | null;
    readonly derivativeRequired: boolean;
    readonly currentVersion: {
      readonly sourceAvailable: boolean;
      readonly provenance: { readonly observedAt?: string };
    } | null;
    readonly runtimeDerivatives: readonly unknown[];
    readonly issues: readonly {
      readonly severity: string;
      readonly message: string;
    }[];
  }[];
}

export interface StudioCanonicalProposalSummary {
  readonly changeRequestId: string;
  readonly semanticId: string;
  readonly status: string;
  readonly branchName: string | null;
  readonly commitSha: string | null;
  readonly pullRequestNumber: number | null;
  readonly pullRequestUrl: string | null;
  readonly validationMessage: string | null;
  readonly updatedAt: string;
}

export interface StudioCanonicalProposalFeed {
  readonly state: "available" | "unavailable";
  readonly observedAt: string | null;
  readonly items: readonly StudioCanonicalProposalSummary[];
  readonly message?: string;
}

export interface StudioReadModelsResponse {
  readonly readModelVersion: number;
  readonly revision: string;
  readonly freshness: {
    readonly gitRevision: string;
    readonly gitState: string;
    readonly registryObservedAt: string;
    readonly providerState: string;
  };
  readonly search: {
    readonly total: number;
    readonly offset: number;
    readonly limit: number;
  };
  readonly models: readonly DashboardEntityReadModel[];
  readonly canonicalProposals: StudioCanonicalProposalFeed;
}

export type DashboardAttentionSeverity = "info" | "warning" | "blocking";

export interface DashboardAttentionItem {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly severity: DashboardAttentionSeverity;
  readonly semanticId: string | null;
  readonly module: DashboardTargetModule | null;
  readonly updatedAt: string | null;
  readonly externalUrl?: string;
}

export interface DashboardAttentionSection {
  readonly id:
    | "review"
    | "validation"
    | "source-integrity"
    | "asset-evidence"
    | "runtime-unpublished"
    | "publish-verification"
    | "canonical-proposals";
  readonly label: string;
  readonly state: "available" | "unavailable";
  readonly items: readonly DashboardAttentionItem[];
  readonly unavailableReason?: string;
}

export interface StudioDashboardProjection {
  readonly state: "ready" | "empty" | "partial";
  readonly implementedAttentionCount: number;
  readonly sections: readonly DashboardAttentionSection[];
}

function normalizedLifecycle(value: string | null): string {
  return value?.trim().toUpperCase().replaceAll("-", " ").replaceAll("_", " ") ?? "";
}

function moduleForEntityType(entityType: string): DashboardTargetModule {
  switch (entityType) {
    case "character":
    case "characters":
      return "characters";
    case "equipment":
      return "equipment";
    case "skill":
    case "skills":
      return "skills";
    case "story":
      return "story";
    case "map":
    case "encounter":
    case "map-encounter":
      return "maps-encounters";
    case "enemy":
    case "enemies":
      return "enemies";
    default:
      return "dashboard";
  }
}

function entityItem(
  model: DashboardEntityReadModel,
  suffix: string,
  title: string,
  detail: string,
  severity: DashboardAttentionSeverity,
): DashboardAttentionItem {
  return {
    id: `${model.semanticId}:${suffix}`,
    title,
    detail,
    severity,
    semanticId: model.semanticId,
    module: moduleForEntityType(model.entityType),
    updatedAt: model.provenance.find((item) => item.authority === "registry")?.observedAt ?? null,
  };
}

function reviewItems(models: readonly DashboardEntityReadModel[]): DashboardAttentionItem[] {
  return models
    .filter((model) => normalizedLifecycle(model.lifecycle) === "IN REVIEW")
    .map((model) =>
      entityItem(
        model,
        "review",
        model.displayName,
        "Registry lifecycle is IN REVIEW. Layer 4 assignment/comment records are not implemented yet.",
        "info",
      ),
    );
}

function validationItems(models: readonly DashboardEntityReadModel[]): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = [];
  for (const model of models) {
    const blocking = model.validations.filter(
      (validation) => validation.blocking && validation.outcome !== "PASSED",
    );
    if (blocking.length === 0) continue;
    items.push(
      entityItem(
        model,
        "validation",
        model.displayName,
        `${blocking.length} blocking validation dimension${blocking.length === 1 ? "" : "s"}: ${blocking
          .map((item) => `${item.dimension} ${item.outcome}`)
          .join(", ")}.`,
        "blocking",
      ),
    );
  }
  return items;
}

const sourceIntegrityCodes = new Set([
  "canonical-unavailable",
  "canonical-malformed",
  "registry-missing",
  "canonical-path-mismatch",
]);

function sourceIntegrityItems(
  models: readonly DashboardEntityReadModel[],
): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = [];
  for (const model of models) {
    const issues = model.issues.filter((issue) => sourceIntegrityCodes.has(issue.code));
    if (issues.length === 0) continue;
    items.push(
      entityItem(
        model,
        "source-integrity",
        model.displayName,
        issues.map((issue) => issue.message).join(" "),
        issues.some((issue) => issue.severity === "blocking") ? "blocking" : "warning",
      ),
    );
  }
  return items;
}

function assetEvidenceItems(models: readonly DashboardEntityReadModel[]): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = [];
  for (const model of models) {
    for (const asset of model.assets) {
      const missingSource = asset.currentVersion === null || !asset.currentVersion.sourceAvailable;
      const missingDerivative = asset.derivativeRequired && asset.runtimeDerivatives.length === 0;
      const blockingIssue = asset.issues.find((issue) => issue.severity === "blocking");
      if (!missingSource && !missingDerivative && !blockingIssue) continue;
      const details = [
        missingSource ? "current source/version missing" : null,
        missingDerivative ? "required runtime derivative evidence missing" : null,
        blockingIssue?.message ?? null,
      ].filter((value): value is string => Boolean(value));
      items.push({
        id: `${model.semanticId}:asset:${asset.semanticId}`,
        title: `${model.displayName} · ${asset.role}${asset.variant ? ` / ${asset.variant}` : ""}`,
        detail: details.join(" · "),
        severity: blockingIssue || missingDerivative ? "blocking" : "warning",
        semanticId: asset.semanticId,
        module: "assets",
        updatedAt:
          asset.currentVersion?.provenance.observedAt ??
          model.provenance.find((item) => item.authority === "registry")?.observedAt ??
          null,
      });
    }
  }
  return items;
}

function runtimeUnpublishedItems(
  models: readonly DashboardEntityReadModel[],
): DashboardAttentionItem[] {
  return models
    .filter((model) => normalizedLifecycle(model.lifecycle) === "RUNTIME READY")
    .map((model) =>
      entityItem(
        model,
        "runtime-unpublished",
        model.displayName,
        "Lifecycle is RUNTIME READY but not PUBLISHED. Publishing remains a separate Layer 5B operation.",
        "warning",
      ),
    );
}

function proposalItems(feed: StudioCanonicalProposalFeed): DashboardAttentionItem[] {
  return feed.items.map((proposal) => {
    const failed = ["VALIDATION_FAILED", "STALE", "CHECKS_FAILED", "FAILED"].includes(
      proposal.status,
    );
    const pending = proposal.status === "CHECKS_PENDING" || proposal.status === "VALIDATING";
    return {
      id: `proposal:${proposal.changeRequestId}`,
      title: `${proposal.semanticId} · ${proposal.status.replaceAll("_", " ")}`,
      detail:
        proposal.validationMessage ??
        (proposal.pullRequestNumber
          ? `Repository proposal PR #${proposal.pullRequestNumber}.`
          : "Repository proposal is recorded but has no pull request yet."),
      severity: failed ? "blocking" : pending ? "warning" : "info",
      semanticId: proposal.semanticId,
      module: "story",
      updatedAt: proposal.updatedAt,
      ...(proposal.pullRequestUrl ? { externalUrl: proposal.pullRequestUrl } : {}),
    } satisfies DashboardAttentionItem;
  });
}

export function buildStudioDashboard(
  response: StudioReadModelsResponse,
): StudioDashboardProjection {
  const availableSections: DashboardAttentionSection[] = [
    {
      id: "review",
      label: "Items in review",
      state: "available",
      items: reviewItems(response.models),
    },
    {
      id: "validation",
      label: "Blocking validation",
      state: "available",
      items: validationItems(response.models),
    },
    {
      id: "source-integrity",
      label: "Canonical / registry mismatches",
      state: "available",
      items: sourceIntegrityItems(response.models),
    },
    {
      id: "asset-evidence",
      label: "Asset source / derivative gaps",
      state: "available",
      items: assetEvidenceItems(response.models),
    },
    {
      id: "runtime-unpublished",
      label: "Runtime ready · unpublished",
      state: "available",
      items: runtimeUnpublishedItems(response.models),
    },
  ];

  const proposalSection: DashboardAttentionSection =
    response.canonicalProposals.state === "available"
      ? {
          id: "canonical-proposals",
          label: "Canonical Git proposals",
          state: "available",
          items: proposalItems(response.canonicalProposals),
        }
      : {
          id: "canonical-proposals",
          label: "Canonical Git proposals",
          state: "unavailable",
          items: [],
          unavailableReason:
            response.canonicalProposals.message ?? "Canonical proposal read source is unavailable.",
        };

  const publishSection: DashboardAttentionSection = {
    id: "publish-verification",
    label: "Publish / verification failures",
    state: "unavailable",
    items: [],
    unavailableReason:
      "Layer 5 publishing and verification records are not implemented yet. This is not a zero-failure claim.",
  };

  const sections = [...availableSections, proposalSection, publishSection];
  const implementedAttentionCount = sections
    .filter((section) => section.state === "available")
    .reduce((total, section) => total + section.items.length, 0);
  const partial =
    sourceIntegrityItems(response.models).length > 0 ||
    sections.some(
      (section) => section.state === "unavailable" && section.id !== "publish-verification",
    );

  return {
    state: partial ? "partial" : implementedAttentionCount === 0 ? "empty" : "ready",
    implementedAttentionCount,
    sections,
  };
}
