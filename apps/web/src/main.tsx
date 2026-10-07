import { FantasiaRuntimeSession, runtimeStatus } from "@fantasia/runtime";
import { render } from "preact";
import { useEffect } from "preact/hooks";
import { createBrowserInputBinding } from "./foundation-browser.js";
import "./styles.css";

function App() {
  useEffect(() => {
    const session = new FantasiaRuntimeSession({
      fixedStep: {
        stepMs: 50,
        maxFrameDeltaMs: 250,
        maxStepsPerFrame: 5,
      },
      random: { kind: "seed", seed: 0 },
      bindings: [{ action: "shell.confirm", binding: { kind: "key", code: "Enter" } }],
      contexts: [
        {
          id: "shell",
          priority: 0,
          actions: [{ action: "shell.confirm" }],
        },
      ],
      activeContexts: ["shell"],
    });
    const input = createBrowserInputBinding(session);
    input.attach();

    return () => input.detach();
  }, []);

  return (
    <main class="shell">
      <p class="eyebrow">Drakeshard Studios</p>
      <h1>Fantasia</h1>
      <p class="status">{runtimeStatus()}</p>
      <p class="note">
        GAME-I01 runtime infrastructure is wired. Gameplay and renderer selection remain intentionally
        deferred.
      </p>
    </main>
  );
}

const root = document.getElementById("app");
if (!root) {
  throw new Error("Fantasia root element was not found.");
}

render(<App />, root);
