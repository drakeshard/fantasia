import { useMemo, useState } from "preact/hooks";
import { FilterBar, SelectableCollection, SelectableRow } from "../../ui/components";
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
        <FilterBar
          label="Character filters"
          primary={
            <TextField
              id="character-filter"
              label="Filter characters"
              type="search"
              value={query}
              placeholder="Name or semantic ID"
              onInput={(event) => setQuery(event.currentTarget.value)}
            />
          }
        />
      }
    >
      {visible.length === 0 ? (
        <StateMessage title={models.length === 0 ? "No canonical characters" : "No matching characters"}>
          {models.length === 0
            ? "The canonical Git source returned no character definitions. Empty is not treated as unavailable."
            : "Change the filter to show another canonical character."}
        </StateMessage>
      ) : (
        <SelectableCollection label="Canonical characters">
          {visible.map((model) => (
            <SelectableRow
              selected={selectedSemanticId === model.semanticId}
              onSelect={() => onSelect(model.semanticId)}
              label={`${model.displayName}, ${model.semanticId}`}
              key={model.semanticId}
            >
              <span class="studio-character-row-content">
                <span class="studio-character-row-content__identity">
                  <strong>{model.displayName}</strong>
                  <code>{model.semanticId}</code>
                </span>
                <span class="studio-character-row__status">
                  <Chip>{model.lifecycle ?? "registry unregistered"}</Chip>
                  <Chip>{model.issues.length === 0 ? "no read issues" : `${model.issues.length} issues`}</Chip>
                </span>
              </span>
            </SelectableRow>
          ))}
        </SelectableCollection>
      )}
    </CollectionTemplate>
  );
}
