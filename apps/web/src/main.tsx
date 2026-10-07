import { runtimeStatus } from "@fantasia/runtime";
import { render } from "preact";
import "./styles.css";

function App() {
  return (
    <main class="shell">
      <p class="eyebrow">Drakeshard Studios</p>
      <h1>Fantasia</h1>
      <p class="status">{runtimeStatus()}</p>
      <p class="note">
        GAME-I00 engineering bootstrap. Gameplay and renderer selection intentionally deferred.
      </p>
    </main>
  );
}

const root = document.getElementById("app");
if (!root) {
  throw new Error("Fantasia root element was not found.");
}

render(<App />, root);
