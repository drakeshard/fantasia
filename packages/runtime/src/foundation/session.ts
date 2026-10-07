import {
  type ActionBinding,
  ActionBindingResolver,
  type InputContextDefinition,
  InputContextRouter,
  type PhysicalInputEvent,
  TickInputHandoff,
  type TickInputSnapshot,
} from "@drakeshard/foundation/input";
import { DeterministicRng, type DeterministicRngState } from "@drakeshard/foundation/random";
import {
  type FixedStepAdvanceResult,
  type FixedStepConfig,
  FixedStepDriver,
} from "@drakeshard/foundation/time";

export type RuntimeRandomSource =
  | { readonly kind: "seed"; readonly seed: number }
  | { readonly kind: "state"; readonly state: DeterministicRngState };

export interface FantasiaRuntimeSessionOptions {
  readonly fixedStep: FixedStepConfig;
  readonly random: RuntimeRandomSource;
  readonly bindings?: readonly ActionBinding[];
  readonly contexts?: readonly InputContextDefinition[];
  readonly activeContexts?: readonly string[];
  readonly initialTick?: number;
}

export interface RuntimeRandom {
  nextUint32(): number;
  nextFloat01(): number;
}

export interface RuntimeTickContext {
  readonly tick: number;
  readonly input: TickInputSnapshot;
  readonly random: RuntimeRandom;
}

export interface RuntimeSessionSnapshot {
  readonly tick: number;
  readonly random: DeterministicRngState;
}

export class FantasiaRuntimeSession {
  readonly #driver: FixedStepDriver;
  readonly #random: DeterministicRng;
  readonly #input: TickInputHandoff;
  #tick: number;

  constructor(options: FantasiaRuntimeSessionOptions) {
    this.#driver = new FixedStepDriver(options.fixedStep);
    this.#random =
      options.random.kind === "seed"
        ? new DeterministicRng(options.random.seed)
        : DeterministicRng.fromState(options.random.state);

    const actions = new ActionBindingResolver(options.bindings ?? []);
    const contexts = new InputContextRouter(options.contexts ?? []);
    for (const context of options.activeContexts ?? []) contexts.activate(context);
    this.#input = new TickInputHandoff({ actions, contexts });

    this.#tick = options.initialTick ?? 0;
    if (!Number.isSafeInteger(this.#tick) || this.#tick < 0) {
      throw new RangeError("initialTick must be a non-negative safe integer");
    }
  }

  get tick(): number {
    return this.#tick;
  }

  ingestPhysicalInput(event: PhysicalInputEvent): void {
    this.#input.ingest(event);
  }

  advance(
    frameDeltaMs: number,
    onTick: (context: RuntimeTickContext) => void,
  ): FixedStepAdvanceResult {
    const frame = this.#driver.advance(frameDeltaMs);

    for (let index = 0; index < frame.steps; index += 1) {
      this.#tick += 1;
      onTick({
        tick: this.#tick,
        input: this.#input.consumeTick(),
        random: this.#random,
      });
    }

    return frame;
  }

  resetTiming(): void {
    this.#driver.reset();
  }

  snapshot(): RuntimeSessionSnapshot {
    return {
      tick: this.#tick,
      random: this.#random.snapshot(),
    };
  }
}
