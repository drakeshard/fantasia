import { describe, expect, it } from "vitest";
import {
  emptyTalentProgressSnapshot,
  restoreTalentProgress,
} from "../../packages/runtime/src/index.ts";

describe("GAME-BACKEND03 Talent persistence restoration", () => {
  it("round-trips the deterministic empty account Talent state", () => {
    const empty = emptyTalentProgressSnapshot();
    const restored = restoreTalentProgress(
      empty.schemaVersion,
      JSON.parse(JSON.stringify(empty.state)),
    );
    expect(restored).toMatchObject({ kind: "restored", snapshot: empty, state: { trees: [] } });
  });

  it("rejects unsupported schemas and malformed payloads", () => {
    expect(restoreTalentProgress(2, { trees: [] })).toMatchObject({
      kind: "rejected",
      reason: "Unsupported Talent progress schema version.",
    });
    expect(restoreTalentProgress(1, { trees: "not-an-array" })).toMatchObject({
      kind: "rejected",
      reason: "Malformed serialized Talent progress.",
    });
  });

  it("rejects unknown trees, unknown nodes, invalid ranks, and superseded historical nodes", () => {
    expect(
      restoreTalentProgress(1, {
        trees: [{ treeId: "class:unknown", nodes: [] }],
      }),
    ).toMatchObject({
      kind: "rejected",
      reason: expect.stringMatching(/Unknown serialized Talent tree/),
    });

    expect(
      restoreTalentProgress(1, {
        trees: [
          {
            treeId: "class:lancer:v0.1-scaffold",
            nodes: [{ nodeId: "UNKNOWN", rank: 1 }],
          },
        ],
      }),
    ).toMatchObject({
      kind: "rejected",
      reason: expect.stringMatching(/Unknown serialized Talent node/),
    });

    expect(
      restoreTalentProgress(1, {
        trees: [
          {
            treeId: "class:lancer:v0.1-scaffold",
            nodes: [{ nodeId: "LAN-IW-DEF-01", rank: 99 }],
          },
        ],
      }),
    ).toMatchObject({
      kind: "rejected",
      reason: expect.stringMatching(/Invalid serialized Talent rank/),
    });

    expect(
      restoreTalentProgress(1, {
        trees: [
          {
            treeId: "class:lancer:v0.1-scaffold",
            nodes: [{ nodeId: "LAN-AN-STB-01", rank: 1 }],
          },
        ],
      }),
    ).toMatchObject({ kind: "rejected", reason: expect.stringMatching(/superseded/) });
  });
});
