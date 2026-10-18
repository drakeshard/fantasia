import { useState } from "preact/hooks";
import { createCharacterDisplayNameProposal, type StoredStudioAuthSession } from "../../studio-session";
import type { CharacterReadModel } from "./model";

export type CharacterProposalState =
  | { readonly kind: "clean" }
  | { readonly kind: "pending" }
  | { readonly kind: "success"; readonly message: string; readonly url: string | null }
  | { readonly kind: "error"; readonly message: string };

export function useCharacterDisplayNameProposal({
  model,
  revision,
  auth,
  canPropose,
}: {
  model: CharacterReadModel;
  revision: string;
  auth: StoredStudioAuthSession;
  canPropose: boolean;
}) {
  const [displayName, setDisplayNameState] = useState(model.displayName);
  const [proposalState, setProposalState] = useState<CharacterProposalState>({ kind: "clean" });

  const setDisplayName = (value: string) => {
    setDisplayNameState(value);
    setProposalState({ kind: "clean" });
  };

  const propose = async () => {
    if (!canPropose || proposalState.kind === "pending") return;
    setProposalState({ kind: "pending" });
    try {
      const response = await createCharacterDisplayNameProposal(auth, {
        semanticId: model.semanticId,
        baseRevision: revision,
        displayName,
      });
      const proposal = response.proposal;
      setProposalState({
        kind: "success",
        message: `Proposal ${proposal?.status ?? "created"}. Git remains canonical until the PR is merged. Layer 4 approval/freeze is separate.`,
        url: typeof proposal?.pullRequestUrl === "string" ? proposal.pullRequestUrl : null,
      });
    } catch (error) {
      setProposalState({
        kind: "error",
        message: error instanceof Error ? error.message : "Character proposal failed.",
      });
    }
  };

  return { displayName, setDisplayName, proposalState, propose } as const;
}
