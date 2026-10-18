import type { ComponentChildren } from "preact";
import { Chip, StateMessage, Surface } from "./primitives";
import { LifecycleBadge, RelationCard, ValidationBadge } from "./semantic";
import { lifecycleStateFromRegistry, validationStateFromRegistry } from "./semantic-model";

export function entityValueText(value: unknown): string {
  if (value === null || value === undefined) return "Not registered";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function EntityFact({ label, value }: { label: string; value: unknown }) {
  return (
    <div class="studio-entity-fact">
      <span>{label}</span>
      <strong>{entityValueText(value)}</strong>
    </div>
  );
}

export function EntityFactGroup({
  title,
  children,
  className,
}: {
  title: string;
  children: ComponentChildren;
  className?: string;
}) {
  return (
    <Surface kind="inset" className={`studio-entity-fact-group${className ? ` ${className}` : ""}`}>
      <h4>{title}</h4>
      {children}
    </Surface>
  );
}

export function EntityWorkspaceHeading({
  title,
  entityType,
  semanticId,
  canonicalPath,
  lifecycle,
}: {
  title: string;
  entityType: string;
  semanticId: string;
  canonicalPath: string;
  lifecycle: string | null;
}) {
  const lifecycleState = lifecycleStateFromRegistry(lifecycle);
  return (
    <div class="studio-entity-heading">
      <div class="studio-entity-heading__identity">
        <span>{entityType}</span>
        <h3>{title}</h3>
        <code>{semanticId}</code>
        <small>{canonicalPath}</small>
      </div>
      <div class="studio-entity-heading__status">
        <span>Registry lifecycle</span>
        {lifecycleState ? (
          <LifecycleBadge state={lifecycleState} />
        ) : (
          <Chip>{lifecycle ?? "Not registered"}</Chip>
        )}
      </div>
    </div>
  );
}

export function EmptyEvidence({ children }: { children: ComponentChildren }) {
  return <StateMessage title="No registered evidence yet">{children}</StateMessage>;
}

export function EvidenceStack({ children }: { children: ComponentChildren }) {
  return <div class="studio-evidence-stack">{children}</div>;
}

type AuthorityProvenanceRecord = {
  readonly authority: string;
  readonly source?: string;
  readonly revision?: string;
  readonly observedAt?: string;
  readonly canonical?: boolean;
};

export function EntityAuthoritySummary({
  canonicalPath,
  revision,
  lifecycle,
  schemaVersion,
  provenance,
}: {
  canonicalPath: string;
  revision: string;
  lifecycle: string | null;
  schemaVersion: number | null;
  provenance: readonly AuthorityProvenanceRecord[];
}) {
  const lifecycleState = lifecycleStateFromRegistry(lifecycle);
  return (
    <Surface kind="inset" className="studio-entity-authority">
      <div>
        <h4>Authority / provenance</h4>
        <p>
          Git remains canonical for structured content. Registry and provider observations are
          separate evidence.
        </p>
      </div>
      <EntityFact label="Canonical path" value={canonicalPath} />
      <EntityFact label="Git revision" value={revision} />
      <EntityFact label="Registry schema" value={schemaVersion} />
      <div class="studio-entity-fact">
        <span>Registry lifecycle</span>
        <strong>
          {lifecycleState ? <LifecycleBadge state={lifecycleState} /> : lifecycle ?? "Not registered"}
        </strong>
      </div>
      {provenance.length === 0 ? (
        <StateMessage title="No provenance observations">
          No authority observations were supplied by the current read model.
        </StateMessage>
      ) : (
        <div class="studio-entity-provenance-list">
          {provenance.map((item, index) => (
            <div class="studio-entity-provenance-row" key={`${item.authority}:${item.source ?? index}`}>
              <div>
                <strong>{item.authority}</strong>
                <span>{item.canonical ? "Canonical authority" : "Observation / metadata"}</span>
              </div>
              <code>{item.source ?? "Source not exposed"}</code>
              <small>
                {item.revision
                  ? `Revision ${item.revision}`
                  : item.observedAt
                    ? `Observed ${item.observedAt}`
                    : "Revision / observation time unavailable"}
              </small>
            </div>
          ))}
        </div>
      )}
    </Surface>
  );
}

type RelationEvidenceRecord = {
  readonly type: string;
  readonly targetSemanticId: string;
  readonly valid: boolean;
};

export function RelationEvidence({
  sourceSemanticId,
  relations,
}: {
  sourceSemanticId: string;
  relations: readonly RelationEvidenceRecord[];
}) {
  if (relations.length === 0) {
    return <EmptyEvidence>No semantic relations are registered for this entity.</EmptyEvidence>;
  }
  return (
    <EvidenceStack>
      {relations.map((relation) => (
        <RelationCard
          key={`${relation.type}:${relation.targetSemanticId}`}
          relationType={relation.type}
          sourceId={sourceSemanticId}
          targetId={relation.targetSemanticId}
          targetLabel={relation.targetSemanticId}
          note={relation.valid ? "Registered target is valid." : "Blocking: target is not registered."}
        />
      ))}
    </EvidenceStack>
  );
}

type ValidationEvidenceRecord = {
  readonly dimension: string;
  readonly outcome: string;
  readonly blocking: boolean;
  readonly checkedAt?: string;
};

export function ValidationEvidence({
  validations,
}: {
  validations: readonly ValidationEvidenceRecord[];
}) {
  if (validations.length === 0) {
    return <EmptyEvidence>No validation results are registered for this entity.</EmptyEvidence>;
  }
  return (
    <EvidenceStack>
      {validations.map((validation) => {
        const state = validationStateFromRegistry(validation.outcome, validation.blocking);
        return (
          <Surface kind="inset" className="studio-entity-validation-row" key={`${validation.dimension}:${validation.outcome}`}>
            <ValidationBadge state={state} />
            <div>
              <strong>{validation.dimension}</strong>
              <p>
                {validation.outcome}
                {validation.blocking ? " · blocking" : ""}
              </p>
              {validation.checkedAt ? <small>Checked {validation.checkedAt}</small> : null}
            </div>
          </Surface>
        );
      })}
    </EvidenceStack>
  );
}

type HistoryEvidenceRecord = {
  readonly eventType: string;
  readonly occurredAt: string;
  readonly sourceKind: string | null;
};

export function HistoryEvidence({ history }: { history: readonly HistoryEvidenceRecord[] }) {
  if (history.length === 0) {
    return <EmptyEvidence>No registry history is registered for this entity.</EmptyEvidence>;
  }
  return (
    <ol class="studio-evidence-stack" aria-label="Registry history">
      {history.map((event) => (
        <li class="studio-entity-history-row" key={`${event.eventType}:${event.occurredAt}`}>
          <strong>{event.eventType}</strong>
          <span>{event.occurredAt}</span>
          <small>{event.sourceKind ?? "source unspecified"}</small>
        </li>
      ))}
    </ol>
  );
}
