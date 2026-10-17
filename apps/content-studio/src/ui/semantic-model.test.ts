import { describe, expect, it } from "vitest";
import {
  lifecycleIndex,
  lifecycleMeta,
  lifecycleOrder,
  providerMeta,
  publicationMeta,
  reviewMeta,
  runtimeReadinessMeta,
  validationMeta,
  verificationMeta,
} from "./semantic-model";

describe("Content Studio semantic model", () => {
  it("preserves the exact frozen lifecycle and order", () => {
    expect(lifecycleOrder).toEqual([
      "working",
      "candidate",
      "in-review",
      "approved",
      "frozen",
      "runtime-ready",
      "published",
      "retired",
    ]);
    expect(lifecycleOrder.map((state) => lifecycleMeta[state].label)).toEqual([
      "WORKING",
      "CANDIDATE",
      "IN REVIEW",
      "APPROVED",
      "FROZEN",
      "RUNTIME READY",
      "PUBLISHED",
      "RETIRED",
    ]);
    expect(lifecycleIndex("working")).toBe(0);
    expect(lifecycleIndex("retired")).toBe(7);
  });

  it("keeps review, validation, runtime readiness, publication and verification independent", () => {
    expect(Object.keys(reviewMeta)).toEqual(["requested", "changes-requested", "approved"]);
    expect(Object.keys(validationMeta)).toEqual(["passed", "warning", "blocking", "unknown"]);
    expect(Object.keys(runtimeReadinessMeta)).toEqual(["not-ready", "ready"]);
    expect(Object.keys(publicationMeta)).toEqual(["unpublished", "published"]);
    expect(Object.keys(verificationMeta)).toEqual(["unverified", "passed", "warning", "blocking"]);

    expect(reviewMeta["changes-requested"].label).toBe("Changes requested");
    expect(runtimeReadinessMeta["not-ready"].label).toBe("Runtime not ready");
    expect(publicationMeta.unpublished.label).toBe("Unpublished");
    expect(verificationMeta.warning.label).toBe("Verification warning");
  });

  it("keeps provider location metadata separate from semantic authority roles", () => {
    expect(providerMeta.git.label).toBe("Git");
    expect(providerMeta.git.role).toContain("Canonical");
    expect(providerMeta.drive.label).toBe("Drive");
    expect(providerMeta.drive.role).toContain("Source/master");
    expect(providerMeta.registry.role).toContain("Workflow");
    expect(providerMeta.runtime.role).toContain("derivative");
  });

  it("gives every semantic state a textual label and non-color cue", () => {
    const groups = [
      lifecycleMeta,
      validationMeta,
      reviewMeta,
      runtimeReadinessMeta,
      publicationMeta,
      verificationMeta,
    ];

    for (const group of groups) {
      for (const meta of Object.values(group)) {
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.icon.length).toBeGreaterThan(0);
        expect(meta.description.length).toBeGreaterThan(0);
      }
    }
  });
});
