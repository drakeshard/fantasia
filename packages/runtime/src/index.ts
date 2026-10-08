import { gameDomainStatus } from "@fantasia/game";

export {
  type DevelopmentBattleActorView,
  type DevelopmentBattleAttackResult,
  type DevelopmentBattleCellView,
  type DevelopmentBattleMoveResult,
  DevelopmentBattleSession,
  type DevelopmentBattleView,
} from "./development-battle.js";
export {
  type EncounterRuntimeEvent,
  type EncounterRuntimeInput,
  EncounterRuntimeRunner,
  type EncounterRuntimeRunnerOptions,
  type EncounterRuntimeSnapshot,
} from "./encounter-runner.js";
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

export const runtimeStatus = (): string =>
  `${gameDomainStatus()} Foundation 0.1.2 runtime integration ready.`;
