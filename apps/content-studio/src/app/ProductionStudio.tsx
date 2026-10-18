import { useEffect, useState } from "preact/hooks";
import { restoreStudioSession, type StudioSessionState, signOutStudio } from "../studio-session";
import { AuthorizedStudio } from "./AuthorizedStudio";
import {
  SignedOutStudio,
  StudioSessionError,
  StudioSessionLoading,
  UnauthorizedStudio,
} from "./StudioAuthViews";

export function ProductionStudio() {
  const [state, setState] = useState<StudioSessionState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    void restoreStudioSession().then((restored) => {
      if (active) setState(restored);
    });
    return () => {
      active = false;
    };
  }, []);

  const signOut = async () => {
    const auth =
      state.status === "authorized" || state.status === "unauthorized" ? state.auth : null;
    await signOutStudio(auth);
    setState({ status: "signed-out" });
  };

  if (state.status === "loading") return <StudioSessionLoading />;
  if (state.status === "signed-out") return <SignedOutStudio onAuthorized={setState} />;
  if (state.status === "unauthorized") {
    return <UnauthorizedStudio auth={state.auth} onSignedOut={() => void signOut()} />;
  }
  if (state.status === "error") {
    return (
      <StudioSessionError
        message={state.message}
        onReturnToSignIn={() => setState({ status: "signed-out" })}
      />
    );
  }
  return <AuthorizedStudio state={state} onSignedOut={() => void signOut()} />;
}
