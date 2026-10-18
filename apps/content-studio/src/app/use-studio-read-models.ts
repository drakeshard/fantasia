import { useEffect, useState } from "preact/hooks";
import type { StudioReadModelsResponse } from "../dashboard-model";
import { fetchStudioReadModels, type StoredStudioAuthSession } from "../studio-session";

export type StudioReadModelState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly response: StudioReadModelsResponse }
  | { readonly status: "error"; readonly message: string };

export function useStudioReadModels(auth: StoredStudioAuthSession): StudioReadModelState {
  const [state, setState] = useState<StudioReadModelState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    void fetchStudioReadModels(auth)
      .then((response) => {
        if (active) setState({ status: "ready", response });
      })
      .catch((error) => {
        if (active) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Studio read failed.",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [auth]);

  return state;
}
