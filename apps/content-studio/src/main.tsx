import { render } from "preact";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/foundation-preview.css";

const lifecycle = [
  "working",
  "candidate",
  "in-review",
  "approved",
  "frozen",
  "runtime-ready",
  "published",
  "retired",
] as const;

const validation = ["passed", "warning", "blocking", "unknown"] as const;

function App() {
  return (
    <main class="foundation-preview" aria-labelledby="studio-title">
      <header class="foundation-preview__hero">
        <p class="foundation-preview__eyebrow">Development foundation preview</p>
        <h1 id="studio-title">Fantasia Content Studio</h1>
        <p>
          Shared theme and semantic-token foundation for later Studio components and workspaces.
        </p>
      </header>

      <section class="preview-section" aria-labelledby="surfaces-title">
        <h2 id="surfaces-title">Surfaces and type</h2>
        <div class="surface-grid">
          <article class="surface-sample surface-sample--canvas">Canvas</article>
          <article class="surface-sample surface-sample--panel">Panel</article>
          <article class="surface-sample surface-sample--raised">Raised</article>
          <article class="surface-sample surface-sample--overlay">Overlay</article>
        </div>
        <div class="type-stack">
          <span class="type-display">Workspace title</span>
          <span class="type-heading">Panel heading</span>
          <span class="type-body">Primary body copy for production information.</span>
          <span class="type-meta">SEMANTIC-ID · v1 · metadata</span>
        </div>
      </section>

      <section class="preview-section" aria-labelledby="lifecycle-title">
        <h2 id="lifecycle-title">Lifecycle</h2>
        <div class="semantic-grid">
          {lifecycle.map((state) => (
            <span class={`semantic-chip semantic-chip--lifecycle-${state}`} key={state}>
              {state.replaceAll("-", " ").toUpperCase()}
            </span>
          ))}
        </div>
      </section>

      <section class="preview-section" aria-labelledby="validation-title">
        <h2 id="validation-title">Validation / readiness</h2>
        <div class="semantic-grid">
          {validation.map((state) => (
            <span class={`semantic-chip semantic-chip--validation-${state}`} key={state}>
              {state.toUpperCase()}
            </span>
          ))}
        </div>
      </section>

      <section class="preview-section" aria-labelledby="focus-title">
        <h2 id="focus-title">Focus and spacing</h2>
        <button class="foundation-action" type="button">
          Focus preview
        </button>
        <div class="spacing-row">
          {[4, 8, 12, 16, 24, 32, 48].map((space) => (
            <span
              style={{ width: `var(--studio-space-${space})` }}
              title={`${space}px`}
              key={space}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("Content Studio root element not found");
render(<App />, root);
