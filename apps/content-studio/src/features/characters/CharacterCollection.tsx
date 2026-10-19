import { useMemo, useState } from "preact/hooks";
import { Chip, TextField } from "../../ui/primitives";
import {
  EmptyState,
  FilterBar,
  SelectableCollection,
  SelectableRow,
  StatusGroup,
} from "../../ui/production-components";
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
          activeSummary={query.trim() ? `${visible.length} of ${models.length} characters` : undefined}
          onClear={query.trim() ? () => setQuery("") : undefined}
        >
          <TextField
            id="character-filter"
            label="Filter characters"
            type="search"
            value={query}
            placeholder="Name or semantic ID"
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
        </FilterBar>
      }
    >
      {visible.length === 0 ? (
        <EmptyState title={models.length === 0 ? "No canonical characters" : "No matching characters"}>
          {models.length === 0
            ? "The canonical Git source returned no character definitions. Empty is not treated as unavailable."
            : "Change or clear the filter to show another canonical character."}
        </EmptyState>
      ) : (
        <SelectableCollection label="Characters">
          {visible.map((model) => (
            <SelectableRow
              selected={selectedSemanticId === model.semanticId}
              title={model.displayName}
              metadata={<code>{model.semanticId}</code>}
              status={
                <StatusGroup label={`Status for ${model.displayName}`}>
                  <Chip>{model.lifecycle ?? "registry unregistered"}</Chip>
                  <Chip>
                    {model.issues.length === 0 ? "no read issues" : `${model.issues.length} issues`}
                  </Chip>
                </StatusGroup>
              }
              onClick={() => onSelect(model.semanticId)}
              key={model.semanticId}
            />
          ))}
        </SelectableCollection>
      )}
    </CollectionTemplate>
  );
}
