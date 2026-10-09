import {
  ProductionBattleSession,
  type ProductionBattleView,
  runtimeStatus,
} from "@fantasia/runtime";
import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { ProductionBattleRenderer } from "./battle-renderer.js";

type ActionMode = "inspect" | "move" | "attack";
type PreviewGoal = Readonly<{ x: number; y: number }>;

function commandMessage(result: ReturnType<ProductionBattleSession["moveSelected"]>): string {
  if (result.kind === "rejected") return `Command rejected: ${result.reason}.`;
  if (result.event?.kind === "actor-moved") {
    return `Moved to ${result.event.goal.x}, ${result.event.goal.y}. ${result.event.movementRemaining} movement remains.`;
  }
  if (result.event?.kind === "direct-attack-resolved") {
    return `Attack dealt ${result.event.appliedDamage} damage${result.event.critical ? " (critical)" : ""}.`;
  }
  if (result.event?.kind === "direct-attack-missed") return "The attack missed.";
  if (result.event?.kind === "turn-ended") {
    return `Turn ended. Round ${result.event.round}; next actor is active.`;
  }
  if (result.event?.kind === "encounter-ended") return `Encounter ended: ${result.event.outcome}.`;
  return "Command applied.";
}

function outcomeLabel(outcome: ProductionBattleView["outcome"]): string {
  switch (outcome) {
    case "player-victory":
      return "Victory";
    case "enemy-victory":
      return "Defeat";
    case "draw":
      return "Draw";
    default:
      return "Battle in progress";
  }
}

function hpPercent(current: number, capacity: number): number {
  return capacity <= 0 ? 0 : Math.max(0, Math.min(100, (current / capacity) * 100));
}

export function BattleApp({ onReturnCampaign }: { readonly onReturnCampaign: () => void }) {
  const battle = useMemo(() => new ProductionBattleSession(), []);
  const [view, setView] = useState<ProductionBattleView>(() => battle.view());
  const [message, setMessage] = useState("Inspect a unit or choose an action.");
  const [actionMode, setActionMode] = useState<ActionMode>("inspect");
  const [previewGoal, setPreviewGoal] = useState<PreviewGoal>();
  const [attackTargetId, setAttackTargetId] = useState<string>();
  const rendererHost = useRef<HTMLDivElement>(null);
  const renderer = useRef<ProductionBattleRenderer>();
  const modeRef = useRef<ActionMode>(actionMode);
  const viewRef = useRef<ProductionBattleView>(view);
  const previewGoalRef = useRef<PreviewGoal | undefined>(previewGoal);

  modeRef.current = actionMode;
  viewRef.current = view;
  previewGoalRef.current = previewGoal;

  useEffect(() => {
    const host = rendererHost.current;
    if (!host) return;

    const instance = new ProductionBattleRenderer(host, {
      onCellActivate: (cell) => {
        const current = viewRef.current;
        const mode = modeRef.current;

        if (mode === "attack" && cell.occupantActorId !== undefined) {
          const target = current.actors.find((actor) => actor.id === cell.occupantActorId);
          const active = current.actors.find((actor) => actor.id === current.activeActorId);
          if (target && active && target.side !== active.side && !target.defeated) {
            setAttackTargetId(target.id);
            setMessage(
              `${target.name} selected as the attack target. Confirm the attack to commit.`,
            );
          }
          return;
        }

        if (mode === "move") {
          if (cell.occupantActorId !== undefined || !cell.reachable) {
            setMessage("Choose an empty reachable square for the move preview.");
            return;
          }
          if (current.selectedActorId !== current.activeActorId) {
            setMessage(`Only ${current.activeActorName} can move this turn.`);
            return;
          }
          const goal = { x: cell.x, y: cell.y };
          setPreviewGoal(goal);
          const preview = battle.view(goal);
          setView(preview);
          setMessage(`Move preview: ${cell.x}, ${cell.y}. Confirm move to commit.`);
          return;
        }

        if (cell.occupantActorId !== undefined) {
          const selected = battle.selectActor(cell.occupantActorId);
          if (selected) {
            setView(selected);
            setMessage(`${selected.selectedActorName} selected for inspection.`);
          }
        }
      },
      onCellPreview: (cell) => {
        if (modeRef.current !== "move" || previewGoalRef.current !== undefined) return;
        setView(cell?.reachable ? battle.view({ x: cell.x, y: cell.y }) : battle.view());
      },
    });
    renderer.current = instance;
    void instance.init().then(() => instance.update(battle.view()));

    return () => {
      renderer.current = undefined;
      instance.destroy();
    };
  }, [battle]);

  useEffect(() => {
    renderer.current?.update(view);
  }, [view]);

  const selectedActor = view.actors.find((actor) => actor.id === view.selectedActorId);
  const activeActor = view.actors.find((actor) => actor.id === view.activeActorId);
  const attackTarget = view.actors.find((actor) => actor.id === attackTargetId);
  const selectedIsActive = view.selectedActorId === view.activeActorId;
  const encounterEnded = view.outcome !== "ongoing";
  const enemyTargets = view.actors.filter(
    (actor) => activeActor && actor.side !== activeActor.side && !actor.defeated,
  );
  const reachableCells = view.cells.filter(
    (cell) => cell.reachable && !cell.blocked && cell.occupantActorId === undefined,
  );

  function resetPreview(nextMode: ActionMode = "inspect") {
    setActionMode(nextMode);
    setPreviewGoal(undefined);
    setAttackTargetId(undefined);
    setView(battle.view());
  }

  function selectActor(id: string) {
    const next = battle.selectActor(id);
    if (!next) return;
    setActionMode("inspect");
    setPreviewGoal(undefined);
    setAttackTargetId(undefined);
    setView(next);
    setMessage(
      next.selectedActorId === next.activeActorId
        ? `${next.selectedActorName} is active and ready for orders.`
        : `${next.selectedActorName} selected for inspection. ${next.activeActorName} has the turn.`,
    );
  }

  function beginMove() {
    if (!selectedIsActive || encounterEnded) {
      setMessage(`Select ${view.activeActorName} before issuing a move.`);
      return;
    }
    resetPreview("move");
    setMessage("Move mode: choose a reachable square, then confirm the preview.");
  }

  function beginAttack() {
    if (!selectedIsActive || encounterEnded || !view.mainActAvailable) {
      setMessage(`Select ${view.activeActorName} with a ready Main Act before attacking.`);
      return;
    }
    resetPreview("attack");
    setMessage("Attack mode: choose an opposing unit, then confirm the attack.");
  }

  function previewMove(goal: PreviewGoal) {
    setActionMode("move");
    setPreviewGoal(goal);
    setAttackTargetId(undefined);
    setView(battle.view(goal));
    setMessage(`Move preview: ${goal.x}, ${goal.y}. Confirm move to commit.`);
  }

  function previewAttack(targetId: string) {
    const target = view.actors.find((actor) => actor.id === targetId);
    if (!target) return;
    setActionMode("attack");
    setPreviewGoal(undefined);
    setAttackTargetId(targetId);
    setView(battle.view());
    setMessage(`${target.name} selected as the attack target. Confirm the attack to commit.`);
  }

  function confirmMove() {
    if (!previewGoal) return;
    const result = battle.moveSelected(previewGoal);
    setActionMode("inspect");
    setPreviewGoal(undefined);
    setAttackTargetId(undefined);
    setView(result.view);
    setMessage(commandMessage(result));
  }

  function confirmAttack() {
    if (!attackTargetId) return;
    const result = battle.attackSelected(attackTargetId);
    setActionMode("inspect");
    setPreviewGoal(undefined);
    setAttackTargetId(undefined);
    setView(result.view);
    setMessage(commandMessage(result));
  }

  function cancelPreview() {
    resetPreview("inspect");
    setMessage("Preview cancelled. No authoritative action was changed.");
  }

  function endTurn() {
    const result = battle.endTurn();
    setActionMode("inspect");
    setPreviewGoal(undefined);
    setAttackTargetId(undefined);
    setView(result.view);
    setMessage(commandMessage(result));
  }

  const previewTitle =
    actionMode === "move" && previewGoal
      ? "Move to selected square"
      : actionMode === "attack" && attackTarget
        ? `Attack ${attackTarget.name}`
        : actionMode === "move"
          ? "Choose a destination"
          : actionMode === "attack"
            ? "Choose a target"
            : "Inspecting battlefield";

  return (
    <main class="battle-screen">
      <section class="battle-stage" aria-label="Fantasia tactical battle">
        <div ref={rendererHost} class="pixi-battlefield" data-testid="production-battlefield" />

        <header class="battle-statusbar">
          <div class="battle-brand">
            <strong>Fantasia</strong>
            <span>Round {view.round}</span>
          </div>
          <div class="turn-status">
            <strong>{view.activeActorName}&apos;s turn</strong>
            <span class="objective-label">Objective</span>
            <span>Defeat the opposing units</span>
          </div>
          <details class="battle-menu">
            <summary>Menu</summary>
            <div class="menu-sheet">
              <p>
                <strong>{outcomeLabel(view.outcome)}</strong>
              </p>
              <button type="button" class="ui-button secondary battle-return" onClick={onReturnCampaign}>
                Return to campaign
              </button>
              <details class="debug-details">
                <summary>Developer diagnostics</summary>
                <p>{runtimeStatus()}</p>
                <p>Pixi / WebGL · Runtime tick {view.runtimeTick}</p>
              </details>
            </div>
          </details>
        </header>

        <aside class="hud-card active-unit-card" aria-label="Active unit">
          <p class="hud-eyebrow">Active unit</p>
          <div class="unit-title-row">
            <span class={`unit-badge ${activeActor?.side ?? "player"}`} aria-hidden="true">
              {activeActor?.shortLabel ?? "--"}
            </span>
            <div>
              <h1>{activeActor?.name ?? view.activeActorName}</h1>
              <p>{activeActor?.role ?? "Unit"}</p>
            </div>
          </div>
          <div class="hp-row">
            <span>HP</span>
            <strong>
              {activeActor?.hpCurrent ?? 0} / {activeActor?.hpCapacity ?? 0}
            </strong>
          </div>
          <div class="hp-track" aria-hidden="true">
            <i
              style={{
                width: `${hpPercent(activeActor?.hpCurrent ?? 0, activeActor?.hpCapacity ?? 0)}%`,
              }}
            />
          </div>
          <dl class="budget-grid">
            <div>
              <dt>Movement</dt>
              <dd>{view.movementRemaining} remaining</dd>
            </div>
            <div>
              <dt>Main action</dt>
              <dd>{view.mainActAvailable ? "Ready" : "Spent"}</dd>
            </div>
          </dl>
          {selectedActor && selectedActor.id !== view.activeActorId ? (
            <p class="selected-note">Inspecting {selectedActor.name}</p>
          ) : null}
        </aside>

        <aside class="hud-card turn-order-card" aria-label="Combatants and current turn">
          <p class="hud-eyebrow">Battle order</p>
          <div class="turn-order-list">
            {view.actors
              .filter((actor) => !actor.defeated)
              .map((actor) => (
                <button
                  type="button"
                  class={`turn-order-entry ${actor.side}${actor.active ? " is-active" : ""}${actor.selected ? " is-selected" : ""}`}
                  onClick={() => selectActor(actor.id)}
                  aria-pressed={actor.selected}
                >
                  <span class="order-mark" aria-hidden="true">
                    {actor.shortLabel}
                  </span>
                  <span>
                    <strong>{actor.name}</strong>
                    <small>
                      {actor.active ? "Active turn" : actor.side === "player" ? "Ally" : "Opponent"}
                    </small>
                  </span>
                </button>
              ))}
          </div>
        </aside>

        <section class={`command-preview mode-${actionMode}`} aria-live="polite">
          <div>
            <p class="hud-eyebrow">{actionMode === "inspect" ? "Status" : "Action preview"}</p>
            <h2>{previewTitle}</h2>
            {actionMode === "move" && previewGoal ? (
              <p>
                Square {previewGoal.x}, {previewGoal.y} · Cost {view.pathCost ?? "—"} · Movement after{" "}
                {view.pathCost === undefined ? "—" : Math.max(0, view.movementRemaining - view.pathCost)}
              </p>
            ) : actionMode === "attack" && attackTarget ? (
              <p>
                Target {attackTarget.name} · {attackTarget.role} · HP {attackTarget.hpCurrent}/
                {attackTarget.hpCapacity}
              </p>
            ) : (
              <p>{message}</p>
            )}
          </div>
          <div class="preview-controls">
            {actionMode !== "inspect" ? (
              <button type="button" class="ui-button secondary" onClick={cancelPreview}>
                Cancel
              </button>
            ) : null}
            {actionMode === "move" && previewGoal ? (
              <button type="button" class="ui-button primary" onClick={confirmMove}>
                Confirm move
              </button>
            ) : null}
            {actionMode === "attack" && attackTarget ? (
              <button type="button" class="ui-button primary" onClick={confirmAttack}>
                Confirm attack
              </button>
            ) : null}
          </div>
        </section>

        <section class="battle-feedback" aria-live="polite">
          <span aria-hidden="true">◆</span>
          <p>{message}</p>
        </section>

        <nav class="battle-actionbar" aria-label="Battle actions">
          <button
            type="button"
            class={`action-button${actionMode === "inspect" ? " is-active" : ""}`}
            onClick={() => resetPreview("inspect")}
            aria-pressed={actionMode === "inspect"}
          >
            Inspect
          </button>
          <button
            type="button"
            class={`action-button${actionMode === "move" ? " is-active" : ""}`}
            onClick={beginMove}
            disabled={encounterEnded || !selectedIsActive || view.movementRemaining <= 0}
            aria-pressed={actionMode === "move"}
          >
            Move
          </button>
          <button
            type="button"
            class={`action-button${actionMode === "attack" ? " is-active" : ""}`}
            onClick={beginAttack}
            disabled={encounterEnded || !selectedIsActive || !view.mainActAvailable}
            aria-pressed={actionMode === "attack"}
          >
            Attack
          </button>
          <button
            type="button"
            class="action-button end-turn"
            onClick={endTurn}
            disabled={encounterEnded}
          >
            End turn
          </button>
        </nav>

        <details class="unit-details-sheet">
          <summary>Unit details</summary>
          <div class="unit-details-content">
            <div class="selected-unit-heading">
              <span class={`unit-badge ${view.selectedActorSide}`} aria-hidden="true">
                {selectedActor?.shortLabel ?? "--"}
              </span>
              <div>
                <strong>{view.selectedActorName}</strong>
                <span>
                  {view.selectedActorRole} · {view.selectedActorSide === "player" ? "Ally" : "Opponent"}
                </span>
              </div>
              <span>
                HP {view.selectedHpCurrent}/{view.selectedHpCapacity}
              </span>
            </div>
            <dl class="attribute-grid">
              <div>
                <dt>Physical</dt>
                <dd>{view.selectedAttributes.physicalPower}</dd>
              </div>
              <div>
                <dt>Magical</dt>
                <dd>{view.selectedAttributes.magicalPower}</dd>
              </div>
              <div>
                <dt>Defense</dt>
                <dd>{view.selectedAttributes.defense}</dd>
              </div>
              <div>
                <dt>Resistance</dt>
                <dd>{view.selectedAttributes.resistance}</dd>
              </div>
              <div>
                <dt>Speed</dt>
                <dd>{view.selectedAttributes.speed}</dd>
              </div>
              <div>
                <dt>Stability</dt>
                <dd>{view.selectedAttributes.stability}</dd>
              </div>
            </dl>

            {actionMode === "move" ? (
              <div class="keyboard-choice-group">
                <p>Reachable destinations</p>
                <div class="choice-list">
                  {reachableCells.map((cell) => (
                    <button
                      type="button"
                      class="choice-button"
                      onClick={() => previewMove({ x: cell.x, y: cell.y })}
                    >
                      {cell.x}, {cell.y} · cost {cell.reachableCost ?? "—"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {actionMode === "attack" ? (
              <div class="keyboard-choice-group">
                <p>Opposing targets</p>
                <div class="choice-list">
                  {enemyTargets.map((actor) => (
                    <button
                      type="button"
                      class={`choice-button${attackTargetId === actor.id ? " is-selected" : ""}`}
                      onClick={() => previewAttack(actor.id)}
                    >
                      Target {actor.name} · HP {actor.hpCurrent}/{actor.hpCapacity}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </details>
      </section>
    </main>
  );
}
