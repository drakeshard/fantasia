import { useState } from "preact/hooks";
import type { StoredStudioAuthSession } from "../../studio-session";
import { EntityWorkspaceHeading } from "../../ui/entity-evidence";
import { Button } from "../../ui/primitives";
import { EntityWorkspaceTemplate } from "../../ui/workspace";
import type { CharacterReadModel } from "./model";
import {
  CharacterAssetsPanel,
  CharacterEquipmentPanel,
  CharacterGameplayPanel,
  CharacterHistoryPanel,
  CharacterOverviewPanel,
  CharacterRelationsPanel,
  CharacterSkillsPanel,
  CharacterStoryPanel,
  CharacterValidationPanel,
} from "./panels";

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

export function CharacterWorkspace({
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
  const panels = {
    overview: (
      <CharacterOverviewPanel
        model={model}
        revision={revision}
        auth={auth}
        canPropose={canPropose}
      />
    ),
    gameplay: <CharacterGameplayPanel model={model} />,
    skills: <CharacterSkillsPanel />,
    equipment: <CharacterEquipmentPanel />,
    assets: <CharacterAssetsPanel model={model} />,
    story: <CharacterStoryPanel />,
    relations: <CharacterRelationsPanel model={model} />,
    validation: <CharacterValidationPanel model={model} />,
    history: <CharacterHistoryPanel model={model} />,
  } as const;

  return (
    <EntityWorkspaceTemplate
      header={
        <EntityWorkspaceHeading
          title={model.displayName}
          entityType="Character"
          semanticId={model.semanticId}
          canonicalPath={model.canonical.canonicalPath}
          lifecycle={model.lifecycle}
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
