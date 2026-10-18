import { useMemo, useState } from "preact/hooks";
import type { DashboardEntityReadModel, StudioReadModelsResponse } from "./dashboard-model";
import { createCharacterDisplayNameProposal, type StoredStudioAuthSession } from "./studio-session";
import { Button, Chip, StateMessage, Surface, TextField } from "./ui/primitives";
import {
  CollectionTemplate,
  EntityWorkspaceTemplate,
  TemplateFixtureHeading,
} from "./ui/workspace";

type CharacterCanonical = {
  readonly canonicalPath: string;
  readonly canonicalData: Readonly<Record<string, unknown>>;
  readonly provenance: { readonly revision?: string };
};

type CharacterReadModel = DashboardEntityReadModel & {
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

const characterTabs = [
  { id: "overview", label: "Overview" },
  { id: "gameplay", label: "Gameplay" },
  { id: "skills", label: "Skills" },
  { id: "equipment", label: "Equipment" },
  { id: "assets", label: "Assets" },
  { id: "story", label: "Story" },
  { id: "relations", label: "Relations" },
  { id: "validation", label: "Validation" },
  { id: "history", label: "History" },
] as const;

function valueText(value: unknown): string {
  if (value === null || value === undefined) return "Not registered";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return String(value);
  return JSON.stringify(value);
}

function Fact({ label, value }: { label: string; value: unknown }) {
  return (
    <div class="studio-character-fact">
      <span>{label}</span>
      <strong>{valueText(value)}</strong>
    </div>
  );
}

function EmptyEvidence({ children }: { children: string }) {
  return <StateMessage title="No registered evidence yet">{children}</StateMessage>;
}

function CharacterCollection({
  models,
  selectedSemanticId,
  onSelect,
}: {
  models: readonly CharacterReadModel[];
  selectedSemanticId: string | null;
  onSelect: (semanticId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return models;
    return models.filter(
      (model) =>
        model.displayName.toLocaleLowerCase().includes(term) ||
        model.semanticId.toLocaleLowerCase().includes(term),
    );
  }, [models, query]);

  return (
    <CollectionTemplate
      header={
        <TemplateFixtureHeading
          title="Characters"
          description="Git-canonical character definitions composed with registry workflow, validation, relations and asset evidence."
          status={<Chip>{models.length} canonical</Chip>}
        />
      }
      filterSlot={
        <TextField
          id="character-filter"
          label="Filter characters"
          type="search"
          value={query}
          placeholder="Name or semantic ID"
          onInput={(event) => setQuery(event.currentTarget.value)}
        />
      }
    >
      {visible.length === 0 ? (
        <StateMessage
          title={models.length === 0 ? "No canonical characters" : "No matching characters"}
        >
          {models.length === 0
            ? "The canonical Git source returned no character definitions. Empty is not treated as unavailable."
            : "Change the filter to show another canonical character."}
        </StateMessage>
      ) : (
        <div class="studio-character-list" data-testid="characters-collection">
          {visible.map((model) => (
            <button
              type="button"
              class="studio-character-row"
              aria-current={selectedSemanticId === model.semanticId ? "true" : undefined}
              onClick={() => onSelect(model.semanticId)}
              key={model.semanticId}
            >
              <span>
                <strong>{model.displayName}</strong>
                <code>{model.semanticId}</code>
              </span>
              <span class="studio-character-row__status">
                <Chip>{model.lifecycle ?? "registry unregistered"}</Chip>
                <Chip>
                  {model.issues.length === 0 ? "no read issues" : `${model.issues.length} issues`}
                </Chip>
              </span>
            </button>
          ))}
        </div>
      )}
    </CollectionTemplate>
  );
}

function CharacterEntity({
  model,
  revision,
  auth,
  canPropose,
  onBack,
}: {
  model: CharacterReadModel;
  revision: string;
  auth: StoredStudioAuthSession;
  canPropose: boolean;
  onBack: () => void;
}) {
  const [tab, setTab] = useState("overview");
  const [displayName, setDisplayName] = useState(model.displayName);
  const [proposalState, setProposalState] = useState<
    | { readonly kind: "clean" }
    | { readonly kind: "pending" }
    | { readonly kind: "success"; readonly message: string; readonly url: string | null }
    | { readonly kind: "error"; readonly message: string }
  >({ kind: "clean" });
  const data = model.canonical.canonicalData;
  const rpg =
    typeof data.rpg === "object" && data.rpg !== null ? (data.rpg as Record<string, unknown>) : {};
  const attributes =
    typeof rpg.attributes === "object" && rpg.attributes !== null
      ? (rpg.attributes as Record<string, unknown>)
      : {};
  const hp =
    typeof rpg.hp === "object" && rpg.hp !== null ? (rpg.hp as Record<string, unknown>) : {};

  const propose = async () => {
    if (!canPropose || proposalState.kind === "pending") return;
    setProposalState({ kind: "pending" });
    try {
      const response = await createCharacterDisplayNameProposal(auth, {
        semanticId: model.semanticId,
        baseRevision: revision,
        displayName,
      });
      const proposal = response.proposal;
      setProposalState({
        kind: "success",
        message: `Proposal ${proposal?.status ?? "created"}. Git remains canonical until the PR is merged. Layer 4 approval/freeze is separate.`,
        url: typeof proposal?.pullRequestUrl === "string" ? proposal.pullRequestUrl : null,
      });
    } catch (error) {
      setProposalState({
        kind: "error",
        message: error instanceof Error ? error.message : "Character proposal failed.",
      });
    }
  };

  const overview = (
    <div class="studio-character-grid">
      <Surface kind="inset">
        <h4>Canonical identity</h4>
        <Fact label="Display name" value={data.displayName} />
        <Fact label="Actor ID" value={data.actorId} />
        <Fact label="Tactical entity" value={data.tacticalEntityId} />
        <Fact label="Side" value={data.side} />
        <Fact label="Short label" value={data.shortLabel} />
      </Surface>
      <Surface kind="inset">
        <h4>Authority</h4>
        <Fact label="Canonical path" value={model.canonical.canonicalPath} />
        <Fact label="Git revision" value={model.canonical.provenance.revision ?? revision} />
        <Fact label="Registry lifecycle" value={model.lifecycle ?? "Not registered"} />
        <Fact label="Registry schema" value={model.schemaVersion ?? "Not registered"} />
      </Surface>
      <Surface kind="inset" className="studio-character-editor">
        <h4>Supported canonical edit</h4>
        <p>
          STUDIO06 intentionally exposes only the character display name through the controlled Git
          proposal path.
        </p>
        <TextField
          id={`display-name-${model.semanticId}`}
          label="Display name"
          value={displayName}
          onInput={(event) => {
            setDisplayName(event.currentTarget.value);
            setProposalState({ kind: "clean" });
          }}
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
      </Surface>
    </div>
  );

  const gameplay = (
    <div class="studio-character-grid">
      <Surface kind="inset">
        <h4>Encounter definition</h4>
        <Fact label="Movement allowance" value={data.movementAllowance} />
        <Fact label="Initial coordinate" value={data.initialCoord} />
        <Fact label="Classes" value={rpg.classes} />
        <Fact label="Initial class" value={rpg.initialClass} />
        <Fact label="HP" value={hp} />
      </Surface>
      <Surface kind="inset">
        <h4>RPG attributes</h4>
        {Object.entries(attributes).map(([key, value]) => (
          <Fact label={key} value={value} key={key} />
        ))}
      </Surface>
    </div>
  );

  const panels = {
    overview,
    gameplay,
    skills: (
      <EmptyEvidence>
        No character-to-skill relations are registered in the current read model.
      </EmptyEvidence>
    ),
    equipment: (
      <EmptyEvidence>
        No character-to-equipment relations are registered in the current read model.
      </EmptyEvidence>
    ),
    assets:
      model.assets.length === 0 ? (
        <EmptyEvidence>No asset records are registered for this character.</EmptyEvidence>
      ) : (
        <div class="studio-character-stack">
          {model.assets.map((asset) => (
            <Surface kind="inset" key={asset.semanticId}>
              <strong>{asset.role}</strong>
              <code>{asset.semanticId}</code>
              <span>
                {asset.currentVersion?.sourceAvailable ? "source registered" : "source unavailable"}
              </span>
            </Surface>
          ))}
        </div>
      ),
    story: (
      <EmptyEvidence>
        Story relationships will appear when semantic character relations are registered; text-name
        matches are not treated as authority.
      </EmptyEvidence>
    ),
    relations:
      model.relations.length === 0 ? (
        <EmptyEvidence>No semantic relations are registered for this character.</EmptyEvidence>
      ) : (
        <div class="studio-character-stack">
          {model.relations.map((relation) => (
            <Surface kind="inset" key={`${relation.type}:${relation.targetSemanticId}`}>
              <strong>{relation.type}</strong>
              <code>{relation.targetSemanticId}</code>
              <span>{relation.valid ? "valid" : "invalid target"}</span>
            </Surface>
          ))}
        </div>
      ),
    validation:
      model.validations.length === 0 ? (
        <EmptyEvidence>No validation results are registered for this character.</EmptyEvidence>
      ) : (
        <div class="studio-character-stack">
          {model.validations.map((validation) => (
            <Surface kind="inset" key={`${validation.dimension}:${validation.outcome}`}>
              <strong>{validation.dimension}</strong>
              <span>
                {validation.outcome}
                {validation.blocking ? " · blocking" : ""}
              </span>
            </Surface>
          ))}
        </div>
      ),
    history:
      model.history.length === 0 ? (
        <EmptyEvidence>No registry history is registered for this character.</EmptyEvidence>
      ) : (
        <div class="studio-character-stack">
          {model.history.map((event) => (
            <Surface kind="inset" key={`${event.eventType}:${event.occurredAt}`}>
              <strong>{event.eventType}</strong>
              <span>{event.occurredAt}</span>
              <small>{event.sourceKind ?? "source unspecified"}</small>
            </Surface>
          ))}
        </div>
      ),
  } as const;

  return (
    <EntityWorkspaceTemplate
      header={
        <TemplateFixtureHeading
          title={model.displayName}
          description={`${model.semanticId} · Git canonical character definition`}
          status={<Chip>{model.lifecycle ?? "registry unregistered"}</Chip>}
        />
      }
      toolbar={
        <Button variant="quiet" onClick={onBack}>
          Back to Characters
        </Button>
      }
      tabsId={`character-${model.semanticId}`}
      tabs={characterTabs}
      selectedTab={tab}
      onTabSelect={setTab}
      panels={panels}
    />
  );
}

export function ProductionCharacters({
  response,
  auth,
  canPropose,
  semanticId,
  onSemanticIdChange,
}: {
  response: StudioReadModelsResponse;
  auth: StoredStudioAuthSession;
  canPropose: boolean;
  semanticId: string | null;
  onSemanticIdChange: (semanticId: string | null) => void;
}) {
  const characters = response.models.filter(
    (model) => model.entityType === "character",
  ) as readonly CharacterReadModel[];
  const selected = semanticId
    ? characters.find((model) => model.semanticId === semanticId)
    : undefined;

  if (semanticId && !selected) {
    return (
      <CollectionTemplate
        header={
          <TemplateFixtureHeading
            title="Character not found"
            description="The requested semantic ID is not present in the current canonical read model."
          />
        }
      >
        <StateMessage title="Canonical character unavailable" tone="error">
          {semanticId}
        </StateMessage>
        <Button onClick={() => onSemanticIdChange(null)}>Return to Characters</Button>
      </CollectionTemplate>
    );
  }

  return selected ? (
    <CharacterEntity
      model={selected}
      revision={response.revision}
      auth={auth}
      canPropose={canPropose}
      onBack={() => onSemanticIdChange(null)}
    />
  ) : (
    <CharacterCollection
      models={characters}
      selectedSemanticId={semanticId}
      onSelect={onSemanticIdChange}
    />
  );
}
