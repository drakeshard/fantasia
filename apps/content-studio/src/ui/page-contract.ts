import type { WorkspaceTemplateKind } from "./workspace";

export const productionPageContractFields = [
  "purpose",
  "authorities",
  "rolesAndActions",
  "template",
  "sections",
  "states",
  "validationAndHistory",
  "responsiveAndAccessibility",
] as const;

export type ProductionPageContract = {
  purpose: string;
  authorities: readonly string[];
  rolesAndActions: readonly string[];
  template: WorkspaceTemplateKind;
  sections: readonly string[];
  states: readonly ("loading" | "empty" | "error" | "read-only" | "unauthorized")[];
  validationAndHistory: string;
  responsiveAndAccessibility: string;
};

export function defineProductionPageContract<T extends ProductionPageContract>(contract: T): T {
  return contract;
}
