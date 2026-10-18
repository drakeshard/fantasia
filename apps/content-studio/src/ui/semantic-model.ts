export const lifecycleOrder = [
  "working",
  "candidate",
  "in-review",
  "approved",
  "frozen",
  "runtime-ready",
  "published",
  "retired",
] as const;

export type LifecycleState = (typeof lifecycleOrder)[number];
export type ValidationState = "passed" | "warning" | "blocking" | "unknown";
export type ReviewState = "requested" | "changes-requested" | "approved";
export type RuntimeReadinessState = "not-ready" | "ready";
export type PublicationState = "unpublished" | "published";
export type VerificationState = "unverified" | "passed" | "warning" | "blocking";
export type ProviderKind = "git" | "drive" | "registry" | "runtime";
export type SourceRole =
  | "canonical-definition"
  | "source-master"
  | "registry-metadata"
  | "runtime-derivative";

export type SemanticMeta = {
  label: string;
  icon: string;
  description: string;
};

export const lifecycleMeta: Record<LifecycleState, SemanticMeta> = {
  working: {
    label: "WORKING",
    icon: "○",
    description: "Editable working content.",
  },
  candidate: {
    label: "CANDIDATE",
    icon: "◇",
    description: "Candidate prepared for review.",
  },
  "in-review": {
    label: "IN REVIEW",
    icon: "◈",
    description: "Version is in formal review.",
  },
  approved: {
    label: "APPROVED",
    icon: "✓",
    description: "Version-specific content approval is recorded.",
  },
  frozen: {
    label: "FROZEN",
    icon: "◆",
    description: "Approved content is frozen against ordinary editing.",
  },
  "runtime-ready": {
    label: "RUNTIME READY",
    icon: "●",
    description: "Lifecycle has reached runtime-ready status.",
  },
  published: {
    label: "PUBLISHED",
    icon: "★",
    description: "Lifecycle has reached published status.",
  },
  retired: {
    label: "RETIRED",
    icon: "—",
    description: "Content is retained in history but no longer active.",
  },
};

export const validationMeta: Record<ValidationState, SemanticMeta> = {
  passed: {
    label: "Passed",
    icon: "✓",
    description: "No blocking validation findings.",
  },
  warning: {
    label: "Warning",
    icon: "!",
    description: "Reviewable validation warning exists.",
  },
  blocking: {
    label: "Blocking",
    icon: "×",
    description: "A blocking validation finding prevents readiness.",
  },
  unknown: {
    label: "Unknown",
    icon: "?",
    description: "Validation result is not available.",
  },
};

export const reviewMeta: Record<ReviewState, SemanticMeta> = {
  requested: {
    label: "Review requested",
    icon: "→",
    description: "A review request exists for this version.",
  },
  "changes-requested": {
    label: "Changes requested",
    icon: "!",
    description: "Review feedback requires changes to this version.",
  },
  approved: {
    label: "Approved",
    icon: "✓",
    description: "Approval is recorded for this specific version.",
  },
};

export const runtimeReadinessMeta: Record<RuntimeReadinessState, SemanticMeta> = {
  "not-ready": {
    label: "Runtime not ready",
    icon: "○",
    description: "Runtime readiness has not been satisfied.",
  },
  ready: {
    label: "Runtime ready",
    icon: "✓",
    description: "Runtime readiness checks are satisfied.",
  },
};

export const publicationMeta: Record<PublicationState, SemanticMeta> = {
  unpublished: {
    label: "Unpublished",
    icon: "○",
    description: "No accepted publication is recorded.",
  },
  published: {
    label: "Published",
    icon: "✓",
    description: "Publication is recorded independently of verification.",
  },
};

export const verificationMeta: Record<VerificationState, SemanticMeta> = {
  unverified: {
    label: "Not verified",
    icon: "?",
    description: "Post-publish verification evidence is not available.",
  },
  passed: {
    label: "Verification passed",
    icon: "✓",
    description: "Current verification evidence passed.",
  },
  warning: {
    label: "Verification warning",
    icon: "!",
    description: "Publication exists with a verification warning.",
  },
  blocking: {
    label: "Verification blocking",
    icon: "×",
    description: "Verification found a blocking release-safety issue.",
  },
};

export const providerMeta: Record<ProviderKind, { label: string; role: string }> = {
  git: { label: "Git", role: "Canonical structured definition / accepted manifest" },
  drive: { label: "Drive", role: "Source/master production asset" },
  registry: { label: "Registry", role: "Workflow and metadata record" },
  runtime: { label: "Runtime delivery", role: "Validated derivative location" },
};

export const sourceRoleMeta: Record<SourceRole, string> = {
  "canonical-definition": "Canonical definition",
  "source-master": "Source / master",
  "registry-metadata": "Registry metadata",
  "runtime-derivative": "Runtime derivative",
};

export function lifecycleIndex(state: LifecycleState) {
  return lifecycleOrder.indexOf(state);
}

export function lifecycleStateFromRegistry(value: string | null | undefined): LifecycleState | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replaceAll("_", "-").replaceAll(" ", "-");
  return lifecycleOrder.includes(normalized as LifecycleState)
    ? (normalized as LifecycleState)
    : null;
}

export function validationStateFromRegistry(
  outcome: string | null | undefined,
  blocking = false,
): ValidationState {
  const normalized = outcome?.trim().toUpperCase() ?? "";
  if (blocking && normalized !== "PASSED") return "blocking";
  if (normalized === "FAILED") return "blocking";
  if (normalized === "WARNING") return "warning";
  if (normalized === "PASSED") return "passed";
  return "unknown";
}
