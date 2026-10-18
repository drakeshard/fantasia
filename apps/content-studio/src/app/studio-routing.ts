import { type StudioModuleId, studioModules } from "../ui/workspace";

export type StudioRoute = {
  readonly module: StudioModuleId;
  readonly semanticId: string | null;
};

export function studioRouteFromLocation(): StudioRoute {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("module");
  return {
    module: studioModules.some((module) => module.id === requested)
      ? (requested as StudioModuleId)
      : "dashboard",
    semanticId: params.get("semanticId"),
  };
}

export function pushStudioRoute(route: StudioRoute): void {
  const params = new URLSearchParams(window.location.search);
  params.delete("lab");
  if (route.module === "dashboard" && !route.semanticId) params.delete("module");
  else params.set("module", route.module);
  if (route.semanticId) params.set("semanticId", route.semanticId);
  else params.delete("semanticId");
  const query = params.toString();
  window.history.pushState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
}
