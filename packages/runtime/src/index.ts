import { gameDomainStatus } from "@fantasia/game";

export const runtimeStatus = (): string => `${gameDomainStatus()} Runtime shell ready.`;
