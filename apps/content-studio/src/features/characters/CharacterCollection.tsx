import { useMemo, useState } from "preact/hooks";
import { Chip, StateMessage, TextField } from "../../ui/primitives";
import { CollectionTemplate, TemplateFixtureHeading } from "../../ui/workspace";
import type { CharacterReadModel } from "./model";

export function CharacterCollection({
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
