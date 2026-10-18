import type { StudioReadModelsResponse } from "../../dashboard-model";
import type { StoredStudioAuthSession } from "../../studio-session";
import { Button, StateMessage } from "../../ui/primitives";
import { CollectionTemplate, TemplateFixtureHeading } from "../../ui/workspace";
import { CharacterCollection } from "./CharacterCollection";
import { CharacterWorkspace } from "./CharacterWorkspace";
import { characterModels } from "./model";

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
  const characters = characterModels(response);
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
    <CharacterWorkspace
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
