import { TalentMenuSession, type TalentNodeView } from "@fantasia/runtime";
import { useMemo, useState } from "preact/hooks";
import { GameUtilityCluster } from "./game-controls.js";

interface TalentAppProps {
  readonly onHome: () => void;
  readonly onSettings: (trigger: HTMLElement) => void;
}

const uiAsset = (name: string) => `/assets/ui/core/${name}`;

function TalentIcon() {
  return (
    <img
      class="talent-icon"
      src={uiAsset("fantasia_ui_icon_talent_default_v001.svg")}
      alt=""
    />
  );
}

function nodeClass(node: TalentNodeView): string {
  const classes = ["talent-node", `is-${node.status}`];
  if (node.rewardLabel === "Value pending") classes.push("is-balance-pending");
  return classes.join(" ");
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
        <div class="talent-heading">
          <span class="talent-heading-icon" aria-hidden="true">
            <TalentIcon />
          </span>
          <span>
            <small>Account progression</small>
            <h1>Talents</h1>
          </span>
        </div>
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
              <button
                key={candidate.id}
                type="button"
                role="tab"
                aria-selected={candidate.id === familyId}
                class={`talent-family-tab${candidate.id === familyId ? " is-selected" : ""}`}
                onClick={() => setFamilyId(candidate.id)}
              >
                <span class="talent-family-mark" aria-hidden="true">
                  {candidate.id === "class" ? "C" : candidate.id === "faction-rule" ? "R" : "P"}
                </span>
                <span class="talent-family-copy">
                  <strong>{candidate.label}</strong>
                  <small>{candidate.description}</small>
                </span>
                <span class={`talent-family-state${candidate.available ? " is-available" : ""}`}>
                  {candidate.available ? `${candidate.treeCount} tree` : "Not authored"}
                </span>
              </button>
            ))}
          </div>

          <div class="talent-account-note" role="note">
            <strong>Shared by the account</strong>
            <span>
              Matching current and future units receive these permanent Talent benefits. Base Speed
              is never increased by permanent Talent.
            </span>
          </div>
        </aside>

        <section class="talent-content" aria-live="polite">
          {familyId === "class" && lancer ? (
            <>
              <div class="talent-tree-heading">
                <span>
                  <small>Class Talent · controlled scaffold</small>
                  <h2>{lancer.className}</h2>
                </span>
                <div class="talent-tree-meta" role="group" aria-label="Current scaffold size">
                  <span>{lancer.nodeCount} nodes shown</span>
                  <span>{lancer.totalRankCapacity} rank capacity</span>
                </div>
              </div>

              <div class="talent-production-boundary" role="note">
                <strong>Previewing controlled design state</strong>
                <span>
                  Purchasing is not available yet. Currency, costs, reset/refund rules, unlock
                  timing and the final Lancer tree are still being authored. Proposed nodes below
                  are not live progression.
                </span>
              </div>

              <div class="talent-doctrine-grid" aria-label="Lancer Talent doctrines">
                {lancer.doctrines.map((doctrine) => (
                  <section class="talent-doctrine" key={doctrine.name}>
                    <header>
                      <small>Doctrine</small>
                      <h3>{doctrine.name}</h3>
                    </header>
                    <div class="talent-node-stack">
                      {doctrine.nodes.map((node) => (
                        <article class={nodeClass(node)} key={node.nodeId}>
                          <div class="talent-node-topline">
                            <span class="talent-node-type">{node.type.replaceAll("-", " ")}</span>
                            <span class="talent-node-status">{node.statusLabel}</span>
                          </div>
                          <h4>{node.name}</h4>
                          <div class="talent-node-reward">{node.rewardLabel}</div>
                          <div class="talent-node-ranks">Rank capacity · {node.ranks}</div>
                          {node.notes ? <p>{node.notes}</p> : null}
                          <code>{node.nodeId}</code>
                        </article>
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
