import {
  type ActorId,
  type ActorIdentityState,
  type AttackResolutionRolls,
  applyEncounterCommand,
  type DamagePolicy,
  type EncounterCommand,
  type EncounterCommandRejection,
  type EncounterDefinition,
  type EncounterState,
} from "@fantasia/game";
import {
  FantasiaRuntimeSession,
  type FantasiaRuntimeSessionOptions,
} from "./foundation/session.js";

export type EncounterRuntimeInput =
  | Readonly<{
      kind: "move";
      actorId: ActorId;
      goal: Readonly<{ x: number; y: number }>;
    }>
  | Readonly<{
      kind: "direct-attack";
      actorId: ActorId;
      defenderId: ActorId;
      attackReference: string;
    }>
  | Readonly<{
      kind: "end-turn";
      actorId: ActorId;
    }>;

export type EncounterRuntimeEvent =
  | Readonly<{
      kind: "command-applied";
      tick: number;
      command: EncounterRuntimeInput;
    }>
  | Readonly<{
      kind: "command-rejected";
      tick: number;
      command: EncounterRuntimeInput;
      reason: EncounterCommandRejection;
    }>;

export interface EncounterRuntimeSnapshot {
  readonly runtime: ReturnType<FantasiaRuntimeSession["snapshot"]>;
  readonly state: EncounterState;
  readonly pendingInputs: readonly EncounterRuntimeInput[];
  readonly events: readonly EncounterRuntimeEvent[];
}

export interface EncounterRuntimeRunnerOptions {
  readonly runtime: FantasiaRuntimeSessionOptions;
  readonly definition: EncounterDefinition;
  readonly identities: ActorIdentityState;
  readonly initialState: EncounterState;
  readonly damagePolicy: DamagePolicy;
}

function resolutionRolls(random: { nextFloat01(): number }): AttackResolutionRolls {
  return {
    hit: random.nextFloat01(),
    critical: random.nextFloat01(),
  };
}

function gameCommand(
  input: EncounterRuntimeInput,
  random: { nextFloat01(): number },
): EncounterCommand {
  if (input.kind === "direct-attack") {
    return { ...input, rolls: resolutionRolls(random) };
  }
  return input;
}

export class EncounterRuntimeRunner {
  readonly #runtime: FantasiaRuntimeSession;
  readonly #definition: EncounterDefinition;
  readonly #identities: ActorIdentityState;
  readonly #damagePolicy: DamagePolicy;
  readonly #pendingInputs: EncounterRuntimeInput[] = [];
  readonly #events: EncounterRuntimeEvent[] = [];
  #state: EncounterState;

  constructor(options: EncounterRuntimeRunnerOptions) {
    this.#runtime = new FantasiaRuntimeSession(options.runtime);
    this.#definition = options.definition;
    this.#identities = options.identities;
    this.#damagePolicy = options.damagePolicy;
    this.#state = options.initialState;
  }

  enqueue(input: EncounterRuntimeInput): void {
    this.#pendingInputs.push(input);
  }

  enqueueAll(inputs: readonly EncounterRuntimeInput[]): void {
    this.#pendingInputs.push(...inputs);
  }

  advance(frameDeltaMs: number): void {
    this.#runtime.advance(frameDeltaMs, ({ tick, random }) => {
      const input = this.#pendingInputs.shift();
      if (input === undefined) return;

      const result = applyEncounterCommand(
        this.#state,
        this.#definition,
        this.#identities,
        this.#damagePolicy,
        gameCommand(input, random),
      );
      this.#state = result.state;
      this.#events.push(
        result.kind === "applied"
          ? { kind: "command-applied", tick, command: input }
          : { kind: "command-rejected", tick, command: input, reason: result.reason },
      );
    });
  }

  snapshot(): EncounterRuntimeSnapshot {
    return {
      runtime: this.#runtime.snapshot(),
      state: this.#state,
      pendingInputs: [...this.#pendingInputs],
      events: [...this.#events],
    };
  }
}
