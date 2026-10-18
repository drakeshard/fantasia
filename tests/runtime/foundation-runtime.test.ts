import { describe, expect, it } from "vitest";
import { FantasiaRuntimeSession } from "../../packages/runtime/src/index.ts";

const fixedStep = {
  stepMs: 50,
  maxFrameDeltaMs: 250,
  maxStepsPerFrame: 5,
} as const;

function createSession(seed = 0x00c0ffee): FantasiaRuntimeSession {
  return new FantasiaRuntimeSession({
    fixedStep,
    random: { kind: "seed", seed },
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
}

describe("GAME-I01 Foundation runtime integration", () => {
  it("repeats tick counts and RNG draws for the same inputs", () => {
    const left = createSession();
    const right = createSession();
    const leftDraws: number[] = [];
    const rightDraws: number[] = [];

    for (const frameDeltaMs of [20, 30, 125, 25, 50]) {
      left.advance(frameDeltaMs, ({ random }) => leftDraws.push(random.nextUint32()));
      right.advance(frameDeltaMs, ({ random }) => rightDraws.push(random.nextUint32()));
    }

    expect(left.tick).toBe(5);
    expect(right.tick).toBe(left.tick);
    expect(rightDraws).toEqual(leftDraws);
    expect(right.snapshot()).toEqual(left.snapshot());
  });

  it("restores deterministic RNG continuation from a runtime snapshot", () => {
    const original = createSession(42);
    original.advance(100, ({ random }) => random.nextUint32());
    const snapshot = original.snapshot();

    const resumed = new FantasiaRuntimeSession({
      fixedStep,
      random: { kind: "state", state: snapshot.random },
      initialTick: snapshot.tick,
    });

    const originalDraws: number[] = [];
    const resumedDraws: number[] = [];
    original.advance(50, ({ random }) => originalDraws.push(random.nextUint32()));
    resumed.advance(50, ({ random }) => resumedDraws.push(random.nextUint32()));

    expect(resumed.tick).toBe(original.tick);
    expect(resumedDraws).toEqual(originalDraws);
  });

  it("hands normalized input to authoritative code only on a simulation tick", () => {
    const session = createSession(7);
    session.ingestPhysicalInput({
      kind: "key",
      sequence: 0,
      code: "Enter",
      phase: "pressed",
    });

    const beforeTick = session.advance(20, () => {
      throw new Error("20 ms must not produce a 50 ms simulation tick");
    });
    expect(beforeTick.steps).toBe(0);

    const snapshots: unknown[] = [];
    session.advance(30, ({ input }) => snapshots.push(input));

    expect(snapshots).toEqual([
      {
        actions: [
          {
            context: "shell",
            action: "shell.confirm",
            held: true,
            pressed: true,
            released: false,
          },
        ],
        transitions: [
          {
            context: "shell",
            action: "shell.confirm",
            sequence: 0,
            phase: "pressed",
          },
        ],
        commands: [],
      },
    ]);
  });
});
