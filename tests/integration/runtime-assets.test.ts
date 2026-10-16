import runtimeAssetManifest from "../../config/runtime-assets.json";
import { describe, expect, it } from "vitest";
import {
  createRuntimeAssetResolver,
  parseRuntimeAssetManifest,
} from "../../packages/runtime/src/index.ts";

describe("GAME-BACKEND04 runtime asset manifest", () => {
  it("validates the repository-owned manifest and resolves semantic ids", () => {
    const manifest = parseRuntimeAssetManifest(runtimeAssetManifest);
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.assets.length).toBeGreaterThan(0);

    const local = createRuntimeAssetResolver(manifest, "/assets/");
    expect(local.resolve("ui.brand.crest")).toBe(
      "/assets/ui/core/fantasia_ui_brand_crest_v001.svg",
    );

    const hosted = createRuntimeAssetResolver(
      manifest,
      "https://example.supabase.co/storage/v1/object/public/runtime-assets/",
    );
    expect(hosted.resolve("ui.icon.talent")).toBe(
      "https://example.supabase.co/storage/v1/object/public/runtime-assets/ui/core/fantasia_ui_icon_talent_default_v001.svg",
    );
  });

  it("rejects unsupported schemas, duplicate ids, duplicate paths, and unsafe paths", () => {
    expect(() => parseRuntimeAssetManifest({ schemaVersion: 2, assets: [] })).toThrow(
      /Unsupported runtime asset manifest schema version/,
    );

    const entry = {
      id: "ui.icon.example",
      path: "ui/core/example.svg",
      mediaType: "image/svg+xml",
      version: 1,
    };
    expect(() => parseRuntimeAssetManifest({ schemaVersion: 1, assets: [entry, entry] })).toThrow(
      /Duplicate runtime asset id/,
    );
    expect(() =>
      parseRuntimeAssetManifest({
        schemaVersion: 1,
        assets: [entry, { ...entry, id: "ui.icon.other" }],
      }),
    ).toThrow(/Duplicate runtime asset path/);
    expect(() =>
      parseRuntimeAssetManifest({
        schemaVersion: 1,
        assets: [{ ...entry, path: "../secret.svg" }],
      }),
    ).toThrow(/unsafe object path/);
  });

  it("rejects unknown semantic ids", () => {
    const resolver = createRuntimeAssetResolver(runtimeAssetManifest, "/assets");
    expect(() => resolver.resolve("ui.icon.missing")).toThrow(/Unknown runtime asset id/);
  });
});
