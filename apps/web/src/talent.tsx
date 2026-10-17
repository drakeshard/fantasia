import {
  TalentMenuSession,
  type TalentNodeView,
  type TalentPrerequisiteView,
} from "@fantasia/runtime";
import { useMemo, useState } from "preact/hooks";
import { GameUtilityCluster } from "./game-controls.js";
import { UiBadge, UiButton, UiPanel, UiTitleLockup } from "./ui/primitives.js";

interface TalentAppProps {
  readonly onHome: () => void;
  readonly onSettings: (trigger: HTMLElement) => void;
}

const uiAsset = (name: string) => `/assets/ui/core/${name}`;

function TalentIcon() {
  return (
    <img class="talent-icon" src={uiAsset("fantasia_ui_icon_talent_default_v001.svg")} alt="" />
  );
}

function nodeClass(node: TalentNodeView): string {
  const classes = ["talent-node", `is-${node.status}`];
  if (node.rewardLabel === "Value pending") classes.push("is-balance-pending");
  return classes.join(" ");
}

function prerequisiteLabel(requirement: TalentPrerequisiteView): string {
  switch (requirement.kind) {
    case "node-rank":
      return `Requires ${requirement.nodeId} · Rank ${requirement.rank}`;
    case "total-tree-ranks":
      return `Requires ${requirement.ranks} total tree ranks`;
    case "doctrine-ranks":
      return `Requires ${requirement.ranks} ${requirement.doctrine} ranks`;
  }
}

function TalentGraphNode({ node }: { readonly node: TalentNodeView }) {
  const requirements = node.prerequisiteGroups.flatMap((group) => group.requirements);
  return (
    <div class="talent-graph-step">
      {requirements.length > 0 ? (
        <div class="talent-graph-prerequisites" aria-label={`Prerequisites for ${node.name}`}>
          <span class="talent-graph-connector" aria-hidden="true" />
          {requirements.map((requirement) => (
            <span class="talent-requirement" key={prerequisiteLabel(requirement)}>
              {prerequisiteLabel(requirement)}
            </span>
          ))}
        </div>
      ) : null}
      <article class={nodeClass(node)} data-talent-node={node.nodeId}>
        <div class="talent-node-topline">
          <span class="talent-node-type">{node.type.replaceAll("-", " ")}</span>
          <UiBadge tone={node.status === "approved" ? "positive" : "neutral"}>
            {node.statusLabel}
          </UiBadge>
        </div>
        <h4>{node.name}</h4>
        <div class="talent-node-reward">{node.rewardLabel}</div>
        <div class="talent-node-ranks">Rank capacity · {node.ranks}</div>
        {node.notes ? <p>{node.notes}</p> : null}
        <code>{node.nodeId}</code>
      </article>
    </div>
  );
}

export function TalentApp({ onHome, onSettings }: TalentAppProps) {
  const session = useMemo(() => new TalentMenuSession(), []);
  const view = session.view();
  const [familyId, setFamilyId] = useState(view.families[0]?.id ?? "class");
  const family = view.families.find((candidate) => candidate.id === familyId) ?? view.families[0];
  const lancer = view.classTrees[0];

  return (
    <main class="talent-screen" aria-label="Talents">
      <header class="talent-hud">
        <UiTitleLockup
          class="talent-heading"
          eyebrow="Account progression"
          title="Talents"
          ornament={<TalentIcon />}
        />
        <GameUtilityCluster onHome={onHome} onSettings={onSettings} />
      </header>

      <section class="talent-workspace">
        <aside class="talent-family-rail" aria-label="Talent families">
          <div class="talent-rail-title">
            <small>Progression families</small>
            <strong>Account-wide growth</strong>
          </div>
          <div class="talent-family-tabs" role="tablist" aria-label="Talent families">
            {view.families.map((candidate) => (
              <UiButton
                key={candidate.id}
                role="tab"
                aria-selected={candidate.id === familyId}
                selected={candidate.id === familyId}
                class="talent-family-tab"
                tone="quiet"
                onClick={() => setFamilyId(candidate.id)}
              >
                <span class="talent-family-mark" aria-hidden="true">
                  {candidate.id === "class" ? "C" : candidate.id === "faction-rule" ? "R" : "P"}
                </span>
                <span class="talent-family-copy">
                  <strong>{candidate.label}</strong>
                  <small>{candidate.description}</small>
                </span>
                <UiBadge
                  class={`talent-family-state${candidate.available ? " is-available" : ""}`}
                  tone={candidate.available ? "positive" : "neutral"}
                >
                  {candidate.available ? `${candidate.treeCount} tree` : "Not authored"}
                </UiBadge>
              </UiButton>
            ))}
          </div>

          <UiPanel class="talent-account-note" ariaLabel="Account-wide Talent rule">
            <strong>Shared by the account</strong>
            <span>
              Matching current and future units receive these permanent Talent benefits. Base Speed
              and Base Stability are never increased by permanent Talent.
            </span>
          </UiPanel>
        </aside>

        <section class="talent-content" aria-live="polite">
          {familyId === "class" && lancer ? (
            <>
              <div class="talent-tree-heading">
                <UiTitleLockup eyebrow="Class Talent · controlled scaffold" title={lancer.className} />
                <div class="talent-tree-meta">
                  <UiBadge>{lancer.nodeCount} nodes shown</UiBadge>
                  <UiBadge>{lancer.totalRankCapacity} rank capacity</UiBadge>
                </div>
              </div>

              <UiPanel
                class="talent-production-boundary"
                tone="overlay"
                ariaLabel="Talent production boundary"
              >
                <strong>Previewing controlled design state</strong>
                <span>
                  Purchasing is not available yet. Currency, costs, reset/refund rules, unlock
                  timing and the final Lancer tree are still being authored. Proposed nodes below
                  are not live progression.
                </span>
              </UiPanel>

              <div class="talent-doctrine-grid talent-graph" aria-label="Lancer Talent graph">
                {lancer.doctrines.map((doctrine) => (
                  <section class="talent-doctrine" key={doctrine.name}>
                    <header>
                      <small>Doctrine</small>
                      <h3>{doctrine.name}</h3>
                    </header>
                    <div class="talent-node-stack">
                      {doctrine.nodes.map((node) => (
                        <TalentGraphNode node={node} key={node.nodeId} />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </>
          ) : (
            <div class="talent-empty-family">
              <span class="talent-empty-emblem" aria-hidden="true">
                <TalentIcon />
              </span>
              <small>{family?.label ?? "Talent"}</small>
              <h2>No production tree is authored yet.</h2>
              <p>
                This Talent family is established by the game system, but its player-facing trees
                and balance data are not ready. Nothing is being invented here just to fill the
                menu.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
