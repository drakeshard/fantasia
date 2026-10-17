import type { ComponentChildren } from "preact";
import { Surface } from "./primitives";
import {
  type LifecycleState,
  lifecycleIndex,
  lifecycleMeta,
  lifecycleOrder,
  type ProviderKind,
  type PublicationState,
  providerMeta,
  publicationMeta,
  type ReviewState,
  type RuntimeReadinessState,
  reviewMeta,
  runtimeReadinessMeta,
  type SourceRole,
  sourceRoleMeta,
  type ValidationState,
  type VerificationState,
  validationMeta,
  verificationMeta,
} from "./semantic-model";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type BadgeProps = {
  dimension: string;
  state: string;
  icon: string;
  label: string;
  description?: string;
};

function SemanticBadgeBase({ dimension, state, icon, label, description }: BadgeProps) {
  return (
    <span
      class={cx("studio-status-badge", `studio-status-badge--${dimension}-${state}`)}
      data-dimension={dimension}
      data-state={state}
      title={description}
    >
      <span class="studio-status-badge__icon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </span>
  );
}

export function LifecycleBadge({ state }: { state: LifecycleState }) {
  const meta = lifecycleMeta[state];
  return (
    <SemanticBadgeBase
      dimension="lifecycle"
      state={state}
      icon={meta.icon}
      label={meta.label}
      description={meta.description}
    />
  );
}

export function ValidationBadge({ state }: { state: ValidationState }) {
  const meta = validationMeta[state];
  return (
    <SemanticBadgeBase
      dimension="validation"
      state={state}
      icon={meta.icon}
      label={meta.label}
      description={meta.description}
    />
  );
}

export function ReviewBadge({ state }: { state: ReviewState }) {
  const meta = reviewMeta[state];
  return (
    <SemanticBadgeBase
      dimension="review"
      state={state}
      icon={meta.icon}
      label={meta.label}
      description={meta.description}
    />
  );
}

export function RuntimeReadinessBadge({ state }: { state: RuntimeReadinessState }) {
  const meta = runtimeReadinessMeta[state];
  return (
    <SemanticBadgeBase
      dimension="runtime"
      state={state}
      icon={meta.icon}
      label={meta.label}
      description={meta.description}
    />
  );
}

export function PublicationBadge({ state }: { state: PublicationState }) {
  const meta = publicationMeta[state];
  return (
    <SemanticBadgeBase
      dimension="publication"
      state={state}
      icon={meta.icon}
      label={meta.label}
      description={meta.description}
    />
  );
}

export function VerificationBadge({ state }: { state: VerificationState }) {
  const meta = verificationMeta[state];
  return (
    <SemanticBadgeBase
      dimension="verification"
      state={state}
      icon={meta.icon}
      label={meta.label}
      description={meta.description}
    />
  );
}

export function LifecycleProgress({
  state,
  versionLabel,
}: {
  state: LifecycleState;
  versionLabel: string;
}) {
  const currentIndex = lifecycleIndex(state);
  return (
    <div class="studio-lifecycle-progress">
      <div class="studio-semantic-heading">
        <div>
          <span class="studio-semantic-heading__label">Lifecycle · {versionLabel}</span>
          <strong>{lifecycleMeta[state].label}</strong>
        </div>
        <LifecycleBadge state={state} />
      </div>
      <ol class="studio-lifecycle-progress__steps" aria-label={`Lifecycle for ${versionLabel}`}>
        {lifecycleOrder.map((step, index) => {
          const relationship =
            index < currentIndex ? "complete" : index === currentIndex ? "current" : "future";
          return (
            <li
              class={`studio-lifecycle-progress__step studio-lifecycle-progress__step--${relationship}`}
              key={step}
              aria-current={relationship === "current" ? "step" : undefined}
            >
              <span class="studio-lifecycle-progress__mark" aria-hidden="true">
                {relationship === "complete" ? "✓" : lifecycleMeta[step].icon}
              </span>
              <span>{lifecycleMeta[step].label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function SemanticDimensionGrid({
  lifecycle,
  validation,
  review,
  runtimeReadiness,
  publication,
  verification,
}: {
  lifecycle: LifecycleState;
  validation: ValidationState;
  review: ReviewState;
  runtimeReadiness: RuntimeReadinessState;
  publication: PublicationState;
  verification: VerificationState;
}) {
  return (
    <dl class="studio-dimension-grid">
      <div>
        <dt>Lifecycle</dt>
        <dd>
          <LifecycleBadge state={lifecycle} />
        </dd>
      </div>
      <div>
        <dt>Validation</dt>
        <dd>
          <ValidationBadge state={validation} />
        </dd>
      </div>
      <div>
        <dt>Review</dt>
        <dd>
          <ReviewBadge state={review} />
        </dd>
      </div>
      <div>
        <dt>Runtime readiness</dt>
        <dd>
          <RuntimeReadinessBadge state={runtimeReadiness} />
        </dd>
      </div>
      <div>
        <dt>Publication</dt>
        <dd>
          <PublicationBadge state={publication} />
        </dd>
      </div>
      <div>
        <dt>Verification</dt>
        <dd>
          <VerificationBadge state={verification} />
        </dd>
      </div>
    </dl>
  );
}

export function ReadinessSummary({
  contentValidation,
  runtimeReadiness,
  blockingCount,
  warningCount,
}: {
  contentValidation: ValidationState;
  runtimeReadiness: RuntimeReadinessState;
  blockingCount: number;
  warningCount: number;
}) {
  return (
    <section class="studio-readiness-summary" aria-label="Readiness summary">
      <div>
        <span>Content validation</span>
        <ValidationBadge state={contentValidation} />
      </div>
      <div>
        <span>Runtime readiness</span>
        <RuntimeReadinessBadge state={runtimeReadiness} />
      </div>
      <p>
        <strong>{blockingCount}</strong> blocking · <strong>{warningCount}</strong> warning
      </p>
    </section>
  );
}

export function ReviewSummary({
  versionLabel,
  state,
  assignee,
  commentCount,
  changeRequestCount,
  approvalEligible,
  freezeEligible,
}: {
  versionLabel: string;
  state: ReviewState;
  assignee: string;
  commentCount: number;
  changeRequestCount: number;
  approvalEligible: boolean;
  freezeEligible: boolean;
}) {
  return (
    <Surface kind="inset" className="studio-review-summary">
      <div class="studio-semantic-heading">
        <div>
          <span class="studio-semantic-heading__label">Review scope</span>
          <strong>{versionLabel}</strong>
        </div>
        <ReviewBadge state={state} />
      </div>
      <dl class="studio-compact-facts">
        <div>
          <dt>Assignee</dt>
          <dd>{assignee}</dd>
        </div>
        <div>
          <dt>Comments</dt>
          <dd>{commentCount}</dd>
        </div>
        <div>
          <dt>Change requests</dt>
          <dd>{changeRequestCount}</dd>
        </div>
      </dl>
      <section class="studio-eligibility-grid" aria-label={`Eligibility for ${versionLabel}`}>
        <span
          class={cx("studio-eligibility-item", approvalEligible ? "is-eligible" : "is-ineligible")}
        >
          <span aria-hidden="true">{approvalEligible ? "✓" : "×"}</span>
          Approval {approvalEligible ? "eligible" : "not eligible"}
        </span>
        <span
          class={cx("studio-eligibility-item", freezeEligible ? "is-eligible" : "is-ineligible")}
        >
          <span aria-hidden="true">{freezeEligible ? "✓" : "×"}</span>
          Freeze {freezeEligible ? "eligible" : "not eligible"}
        </span>
      </section>
      <p class="studio-semantic-note">
        Presentation only. Privileged approval or freeze mutation is not implemented.
      </p>
    </Surface>
  );
}

export function VersionBadge({ label, current }: { label: string; current: boolean }) {
  return (
    <span class={cx("studio-version-badge", current ? "is-current" : "is-historical")}>
      <span aria-hidden="true">{current ? "●" : "◌"}</span>
      {label} · {current ? "Current version" : "Historical version"}
    </span>
  );
}

export function VersionHistoryItem({
  label,
  current,
  lifecycle,
  createdAt,
  summary,
}: {
  label: string;
  current: boolean;
  lifecycle: LifecycleState;
  createdAt: string;
  summary: string;
}) {
  return (
    <li class="studio-version-row">
      <div class="studio-version-row__top">
        <VersionBadge label={label} current={current} />
        <LifecycleBadge state={lifecycle} />
      </div>
      <p>{summary}</p>
      <span class="studio-semantic-note">{createdAt}</span>
    </li>
  );
}

export function ProviderReference({
  semanticId,
  provider,
  reference,
  sourceRole,
}: {
  semanticId: string;
  provider: ProviderKind;
  reference: string;
  sourceRole: SourceRole;
}) {
  return (
    <div class="studio-provider-reference">
      <div class="studio-provider-reference__identity">
        <span>Semantic ID</span>
        <code>{semanticId}</code>
      </div>
      <div class="studio-provider-reference__location">
        <span>
          {providerMeta[provider].label} · {sourceRoleMeta[sourceRole]}
        </span>
        <code>{reference}</code>
        <small>{providerMeta[provider].role}</small>
      </div>
    </div>
  );
}

export function ProvenanceSummary({
  semanticId,
  sourceVersion,
  provider,
  sourceReference,
  checksum,
  processingProfile,
}: {
  semanticId: string;
  sourceVersion: string;
  provider: ProviderKind;
  sourceReference: string;
  checksum: string;
  processingProfile?: string;
}) {
  return (
    <Surface kind="inset" className="studio-provenance">
      <div class="studio-semantic-heading">
        <div>
          <span class="studio-semantic-heading__label">Provenance</span>
          <strong>{semanticId}</strong>
        </div>
        <VersionBadge label={sourceVersion} current />
      </div>
      <ProviderReference
        semanticId={semanticId}
        provider={provider}
        reference={sourceReference}
        sourceRole={provider === "drive" ? "source-master" : "canonical-definition"}
      />
      <dl class="studio-compact-facts">
        <div>
          <dt>Source version</dt>
          <dd>{sourceVersion}</dd>
        </div>
        <div>
          <dt>Checksum</dt>
          <dd>
            <code>{checksum}</code>
          </dd>
        </div>
        {processingProfile ? (
          <div>
            <dt>Processing profile</dt>
            <dd>{processingProfile}</dd>
          </div>
        ) : null}
      </dl>
    </Surface>
  );
}

export function RelationCard({
  relationType,
  sourceId,
  targetId,
  targetLabel,
  note,
}: {
  relationType: string;
  sourceId: string;
  targetId: string;
  targetLabel: string;
  note?: string;
}) {
  return (
    <article class="studio-relation-card">
      <span class="studio-relation-card__type">{relationType}</span>
      <div class="studio-relation-card__path">
        <code>{sourceId}</code>
        <span aria-hidden="true">→</span>
        <div>
          <strong>{targetLabel}</strong>
          <code>{targetId}</code>
        </div>
      </div>
      {note ? <p>{note}</p> : null}
    </article>
  );
}

export function RuntimeDerivativeCard({
  derivativeId,
  sourceVersion,
  runtimeReadiness,
  publication,
  verification,
  checksum,
  providerReference,
}: {
  derivativeId: string;
  sourceVersion: string;
  runtimeReadiness: RuntimeReadinessState;
  publication: PublicationState;
  verification: VerificationState;
  checksum: string;
  providerReference: string;
}) {
  return (
    <article class="studio-runtime-card">
      <div class="studio-semantic-heading">
        <div>
          <span class="studio-semantic-heading__label">Runtime derivative</span>
          <strong style={{ overflowWrap: "anywhere" }}>{derivativeId}</strong>
        </div>
        <RuntimeReadinessBadge state={runtimeReadiness} />
      </div>
      <div class="studio-runtime-card__statuses">
        <PublicationBadge state={publication} />
        <VerificationBadge state={verification} />
      </div>
      <dl class="studio-compact-facts">
        <div>
          <dt>Source version</dt>
          <dd>{sourceVersion}</dd>
        </div>
        <div>
          <dt>Runtime location</dt>
          <dd>
            <code>{providerReference}</code>
          </dd>
        </div>
        <div>
          <dt>Checksum</dt>
          <dd>
            <code>{checksum}</code>
          </dd>
        </div>
      </dl>
      <p class="studio-semantic-note">
        Derivative status is shown separately from source lifecycle and approval.
      </p>
    </article>
  );
}

export function SemanticFixture({
  title,
  description,
  children,
  testId,
}: {
  title: string;
  description: string;
  children: ComponentChildren;
  testId?: string;
}) {
  return (
    <Surface kind="card" className="studio-semantic-fixture">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <div class="studio-semantic-fixture__body" data-testid={testId}>
        {children}
      </div>
    </Surface>
  );
}
