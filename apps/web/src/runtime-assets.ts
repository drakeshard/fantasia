import { createRuntimeAssetResolver } from "@fantasia/runtime";
import runtimeAssetManifest from "../../../config/runtime-assets.json";

const localAssetBaseUrl = "/assets";

function runtimeAssetBaseUrl(): string {
  const configured = import.meta.env.VITE_RUNTIME_ASSET_BASE_URL?.trim();
  return configured || localAssetBaseUrl;
}

const runtimeAssetResolver = createRuntimeAssetResolver(runtimeAssetManifest, runtimeAssetBaseUrl());

export function runtimeAssetUrl(assetId: string): string {
  return runtimeAssetResolver.resolve(assetId);
}
