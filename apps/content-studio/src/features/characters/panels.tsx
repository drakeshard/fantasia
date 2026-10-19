import type { StoredStudioAuthSession } from "../../studio-session";
import { AssetBoard } from "../../ui/asset-board";
import {
  EmptyEvidence,
  EntityAuthoritySummary,
  HistoryEvidence,
  RelationEvidence,
  ValidationEvidence,
} from "../../ui/entity-evidence";
import { Button, StateMessage, TextField } from "../../ui/primitives";
import { KeyValueList, Section } from "../../ui/production-components";
import { type CharacterReadModel, characterDomainData } from "./model";
import { useCharacterDisplayNameProposal } from "./use-display-name-proposal";

export function CharacterOverviewPanel({
  model,
  revision,
  auth,
  canPropose,
}: {
  model: CharacterReadModel;
  revision: string;
  auth: StoredStudioAuthSession;
  canPropose: boolean;
}) {
  const { canonical: data } = characterDomainData(model);
  const { displayName, setDisplayName, proposalState, propose } = useCharacterDisplayNameProposal({
    model,
    revision,
    auth,
    canPropose,
  });

  return (
    <div class="studio-character-grid">
      <Section title="Canonical identity">
        <KeyValueList
          label="Canonical character identity"
          items={[
            { label: "Display name", value: data.displayName },
            { label: "Actor ID", value: data.actorId },
            { label: "Tactical entity", value: data.tacticalEntityId },
            { label: "Side", value: data.side },
            { label: "Short label", value: data.shortLabel },
          ]}
        />
      </Section>
      <EntityAuthoritySummary
        canonicalPath={model.canonical.canonicalPath}
        revision={model.canonical.provenance.revision ?? revision}
        lifecycle={model.lifecycle}
        schemaVersion={model.schemaVersion}
        provenance={model.provenance}
      />
      <Section
        title="Supported canonical edit"
        description="STUDIO06 intentionally exposes only the character display name through the controlled Git proposal path."
      >
        <div class="studio-character-editor">
          <TextField
            id={`display-name-${model.semanticId}`}
            label="Display name"
            value={displayName}
            onInput={(event) => setDisplayName(event.currentTarget.value)}
            disabled={!canPropose}
          />
          <Button
            variant="primary"
            pending={proposalState.kind === "pending"}
            disabled={!canPropose || displayName.trim() === model.displayName || !displayName.trim()}
            onClick={() => void propose()}
          >
            Create Git proposal
          </Button>
          {!canPropose ? (
            <StateMessage title="Read-only access" tone="unavailable">
              This role can inspect canonical character facts but cannot create canonical change
              proposals.
            </StateMessage>
          ) : null}
          {proposalState.kind === "success" ? (
            <StateMessage title="Proposal recorded">
              {proposalState.message}
              {proposalState.url ? ` PR: ${proposalState.url}` : ""}
            </StateMessage>
          ) : proposalState.kind === "error" ? (
            <StateMessage title="Proposal failed" tone="error">
              {proposalState.message}
            </StateMessage>
          ) : null}
        </div>
      </Section>
    </div>
  );
}

export function CharacterGameplayPanel({ model }: { model: CharacterReadModel }) {
  const { canonical: data, rpg, attributes, hp } = characterDomainData(model);
  return (
    <div class="studio-character-grid">
      <Section title="Encounter definition">
        <KeyValueList
          label="Encounter definition"
          items={[
            { label: "Movement allowance", value: data.movementAllowance },
            { label: "Initial coordinate", value: data.initialCoord },
            { label: "Classes", value: Array.isArray(rpg.classes) ? rpg.classes.join(", ") : String(rpg.classes) },
            { label: "Initial class", value: rpg.initialClass },
            { label: "HP", value: typeof hp === "object" ? JSON.stringify(hp) : String(hp) },
          ]}
        />
      </Section>
      <Section title="RPG attributes">
        <KeyValueList
          label="RPG attributes"
          items={Object.entries(attributes).map(([label, value]) => ({ label, value: String(value) }))}
        />
      </Section>
    </div>
  );
}

export function CharacterSkillsPanel() {
  return (
    <EmptyEvidence>
      No character-to-skill relations are registered in the current read model.
    </EmptyEvidence>
  );
}

export function CharacterEquipmentPanel() {
  return (
    <EmptyEvidence>
      No character-to-equipment relations are registered in the current read model.
    </EmptyEvidence>
  );
}

export function CharacterAssetsPanel({ model }: { model: CharacterReadModel }) {
  return <AssetBoard assets={model.assets} readOnly />;
}

export function CharacterStoryPanel() {
  return (
    <EmptyEvidence>
      Story relationships will appear when semantic character relations are registered; text-name
      matches are not treated as authority.
    </EmptyEvidence>
  );
}

export function CharacterRelationsPanel({ model }: { model: CharacterReadModel }) {
  return <RelationEvidence sourceSemanticId={model.semanticId} relations={model.relations} />;
}

export function CharacterValidationPanel({ model }: { model: CharacterReadModel }) {
  return <ValidationEvidence validations={model.validations} />;
}

export function CharacterHistoryPanel({ model }: { model: CharacterReadModel }) {
  return <HistoryEvidence history={model.history} />;
}
