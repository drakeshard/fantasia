import { gameDomainStatus } from "@fantasia/game";

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

export const runtimeStatus = (): string =>
  `${gameDomainStatus()} Foundation 0.1.2 runtime integration ready.`;
