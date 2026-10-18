import type { ComponentChildren } from "preact";
import { StateMessage, Surface } from "./primitives";

export function entityValueText(value: unknown): string {
  if (value === null || value === undefined) return "Not registered";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

export function EntityFact({ label, value }: { label: string; value: unknown }) {
  return (
    <div class="studio-character-fact studio-entity-fact">
      <span>{label}</span>
      <strong>{entityValueText(value)}</strong>
    </div>
  );
}

export function EmptyEvidence({ children }: { children: ComponentChildren }) {
  return <StateMessage title="No registered evidence yet">{children}</StateMessage>;
}

export function EvidenceStack({ children }: { children: ComponentChildren }) {
  return <div class="studio-character-stack studio-evidence-stack">{children}</div>;
}

type AssetEvidenceRecord = {
  readonly semanticId: string;
  readonly role: string;
  readonly currentVersion: { readonly sourceAvailable: boolean } | null;
};

export function AssetEvidence({ assets }: { assets: readonly AssetEvidenceRecord[] }) {
  if (assets.length === 0) {
    return <EmptyEvidence>No asset records are registered for this entity.</EmptyEvidence>;
  }
  return (
    <EvidenceStack>
      {assets.map((asset) => (
        <Surface kind="inset" key={asset.semanticId}>
          <strong>{asset.role}</strong>
          <code>{asset.semanticId}</code>
          <span>{asset.currentVersion?.sourceAvailable ? "source registered" : "source unavailable"}</span>
        </Surface>
      ))}
    </EvidenceStack>
  );
}

type RelationEvidenceRecord = {
  readonly type: string;
  readonly targetSemanticId: string;
  readonly valid: boolean;
};

export function RelationEvidence({ relations }: { relations: readonly RelationEvidenceRecord[] }) {
  if (relations.length === 0) {
    return <EmptyEvidence>No semantic relations are registered for this entity.</EmptyEvidence>;
  }
  return (
    <EvidenceStack>
      {relations.map((relation) => (
        <Surface kind="inset" key={`${relation.type}:${relation.targetSemanticId}`}>
          <strong>{relation.type}</strong>
          <code>{relation.targetSemanticId}</code>
          <span>{relation.valid ? "valid" : "invalid target"}</span>
        </Surface>
      ))}
    </EvidenceStack>
  );
}

type ValidationEvidenceRecord = {
  readonly dimension: string;
  readonly outcome: string;
  readonly blocking: boolean;
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
      {validations.map((validation) => (
        <Surface kind="inset" key={`${validation.dimension}:${validation.outcome}`}>
          <strong>{validation.dimension}</strong>
          <span>
            {validation.outcome}
            {validation.blocking ? " · blocking" : ""}
          </span>
        </Surface>
      ))}
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
    <EvidenceStack>
      {history.map((event) => (
        <Surface kind="inset" key={`${event.eventType}:${event.occurredAt}`}>
          <strong>{event.eventType}</strong>
          <span>{event.occurredAt}</span>
          <small>{event.sourceKind ?? "source unspecified"}</small>
        </Surface>
      ))}
    </EvidenceStack>
  );
}
