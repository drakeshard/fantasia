import { gameDomainStatus } from "@fantasia/game";

export type { CampaignProgressSnapshot } from "@fantasia/game";
export {
  type CampaignChapterView,
  type CampaignEntryResult,
  CampaignSession,
  type CampaignSessionOptions,
  type CampaignStageView,
  type CampaignView,
} from "./campaign-session.js";
export {
  type DevelopmentBattleActorView,
  type DevelopmentBattleAttackResult,
  type DevelopmentBattleCellView,
  type DevelopmentBattleMoveResult,
  DevelopmentBattleSession,
  type DevelopmentBattleView,
} from "./development-battle.js";
export {
  type EconomyRestoreResult,
  type EconomySnapshot,
  FANTASIA_ECONOMY_SCHEMA_VERSION,
  type PersistedCurrencyBalanceRow,
  type PersistedCurrencyLedgerRow,
  restoreEconomyState,
} from "./economy-progress.js";
export {
  type EncounterRuntimeEvent,
  type EncounterRuntimeInput,
  EncounterRuntimeRunner,
  type EncounterRuntimeRunnerOptions,
  type EncounterRuntimeSnapshot,
} from "./encounter-runner.js";
export {
  type EquipmentRestoreResult,
  type EquipmentSnapshot,
  FANTASIA_EQUIPMENT_SCHEMA_VERSION,
  type PersistedEquipmentInstanceRow,
  restoreEquipmentInstances,
} from "./equipment-progress.js";
export {
  createFantasiaSaveService,
  FANTASIA_GAME_ID,
  FANTASIA_SAVE_FORMAT_VERSION,
  type FantasiaSaveServiceOptions,
} from "./foundation/persistence.js";
export {
  FantasiaRuntimeSession,
  type FantasiaRuntimeSessionOptions,
  type RuntimeRandom,
  type RuntimeRandomSource,
  type RuntimeSessionSnapshot,
  type RuntimeTickContext,
} from "./foundation/session.js";
export {
  createFantasiaEncounterSavePayload,
  type EncounterSaveCompatibilityRejection,
  type EncounterSaveResult,
  FANTASIA_DATA_SCHEMA_VERSION,
  type FantasiaEncounterSavePayload,
  loadFantasiaEncounter,
  type RestoredEncounterRuntime,
  type RestoreEncounterRuntimeOptions,
  saveFantasiaEncounter,
} from "./persistence/encounter-save.js";
export {
  type ProductionBattleActorView,
  type ProductionBattleAttributeView,
  type ProductionBattleCellView,
  type ProductionBattleCommandResult,
  ProductionBattleSession,
  type ProductionBattleView,
} from "./production-battle.js";
export {
  FANTASIA_ROSTER_SCHEMA_VERSION,
  type PersistedUnitInstanceRow,
  type RosterRestoreResult,
  type RosterSnapshot,
  restoreRosterUnitInstances,
} from "./roster-progress.js";
export {
  createRuntimeAssetResolver,
  FANTASIA_RUNTIME_ASSET_MANIFEST_SCHEMA_VERSION,
  parseRuntimeAssetManifest,
  type RuntimeAssetDefinition,
  type RuntimeAssetManifest,
  RuntimeAssetResolver,
} from "./runtime-assets.js";
export {
  emptyTalentProgressSnapshot,
  FANTASIA_TALENT_PROGRESS_SCHEMA_VERSION,
  restoreTalentProgress,
  type TalentProgressRestoreResult,
  type TalentProgressSnapshot,
} from "./talent-progress.js";
export {
  type ClassTalentTreeView,
  type TalentDoctrineView,
  type TalentFamilyView,
  type TalentFamilyViewId,
  TalentMenuSession,
  type TalentMenuView,
  type TalentNodeView,
} from "./talent-session.js";

export const runtimeStatus = (): string =>
  `${gameDomainStatus()} Foundation 0.1.2 runtime integration ready.`;
