import { useState } from "preact/hooks";
import { runtimeAssetUrl } from "../runtime-assets.js";
import {
  UiArtFrame,
  UiBadge,
  UiButton,
  UiDivider,
  UiFeedback,
  UiHudStrip,
  UiIconButton,
  UiPanel,
  UiSelectableRow,
  UiTitleLockup,
} from "./primitives.js";

export function PrimitivesReviewApp() {
  const [selected, setSelected] = useState("continue");
  const [busy, setBusy] = useState(false);

  return (
    <main class="ui-primitives-review" aria-label="Fantasia UI primitive review">
      <header class="ui-primitives-review-header">
        <UiTitleLockup
          eyebrow="GAME-UI24C"
          title="Global Primitives v1"
          detail="Development-only review surface for reusable player-facing controls and states."
          ornament={<img src={runtimeAssetUrl("ui.brand.crest")} alt="" />}
        />
        <UiHudStrip ariaLabel="Review status">
          <UiBadge tone="positive">Tokens linked</UiBadge>
          <UiBadge tone="info">Presentation only</UiBadge>
        </UiHudStrip>
      </header>

      <div class="ui-primitives-review-grid">
        <UiPanel tone="raised" class="ui-primitives-review-section" ariaLabel="Buttons">
          <UiTitleLockup eyebrow="Controls" title="Buttons & commitment" />
          <div class="ui-primitives-review-row">
            <UiButton>Neutral action</UiButton>
            <UiButton tone="primary">Primary commitment</UiButton>
            <UiButton tone="quiet">Quiet utility</UiButton>
            <UiButton tone="danger">Danger action</UiButton>
          </div>
          <div class="ui-primitives-review-row">
            <UiButton selected>Selected</UiButton>
            <UiButton disabled>Disabled</UiButton>
            <UiButton
              busy={busy}
              onClick={() => {
                setBusy(true);
                window.setTimeout(() => setBusy(false), 800);
              }}
            >
              {busy ? "Working" : "Preview busy"}
            </UiButton>
            <UiIconButton
              label="Settings"
              icon={<img src={runtimeAssetUrl("ui.icon.settings")} alt="" />}
            />
          </div>
        </UiPanel>

        <UiPanel class="ui-primitives-review-section" ariaLabel="Status">
          <UiTitleLockup eyebrow="State" title="Badges & feedback" />
          <div class="ui-primitives-review-row">
            <UiBadge>Neutral</UiBadge>
            <UiBadge tone="positive">Ready</UiBadge>
            <UiBadge tone="warning">Review</UiBadge>
            <UiBadge tone="danger">Blocked</UiBadge>
            <UiBadge tone="info">Information</UiBadge>
          </div>
          <UiFeedback title="Loading account state" detail="Pending work prevents duplicate commitment." tone="loading" />
          <UiFeedback title="Nothing selected" detail="Choose an item to inspect its details." tone="empty" />
          <UiFeedback title="Action unavailable" detail="The requested state is not currently valid." tone="error" />
        </UiPanel>

        <UiPanel class="ui-primitives-review-section" ariaLabel="Selectable rows">
          <UiTitleLockup eyebrow="Selection" title="Rows & navigation choices" />
          <div class="ui-primitives-review-stack">
            <UiSelectableRow
              title="Continue current journey"
              detail="Return to the current valid campaign context"
              selected={selected === "continue"}
              onClick={() => setSelected("continue")}
              trailing={<UiBadge tone="positive">Current</UiBadge>}
            />
            <UiSelectableRow
              title="Characters"
              detail="Inspect owned allies and presentation state"
              selected={selected === "characters"}
              onClick={() => setSelected("characters")}
            />
            <UiSelectableRow
              title="Unavailable feature"
              detail="Truthful disabled state"
              disabled
              trailing={<UiBadge>Unavailable</UiBadge>}
            />
          </div>
        </UiPanel>

        <UiPanel class="ui-primitives-review-section" ariaLabel="Surfaces and art framing">
          <UiTitleLockup eyebrow="Surfaces" title="Panels, dividers & art frame" />
          <UiDivider label="Current Saga" />
          <UiArtFrame label="Decorative art frame primitive">
            <div class="ui-primitives-review-art">
              <img src={runtimeAssetUrl("ui.brand.crest")} alt="" />
              <span>Artwork remains content, not control authority.</span>
            </div>
          </UiArtFrame>
        </UiPanel>
      </div>
    </main>
  );
}
