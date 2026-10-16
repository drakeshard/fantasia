export const FANTASIA_RUNTIME_ASSET_MANIFEST_SCHEMA_VERSION = 1 as const;

export interface RuntimeAssetDefinition {
  readonly id: string;
  readonly path: string;
  readonly mediaType: string;
  readonly version: number;
}

export interface RuntimeAssetManifest {
  readonly schemaVersion: typeof FANTASIA_RUNTIME_ASSET_MANIFEST_SCHEMA_VERSION;
  readonly assets: readonly RuntimeAssetDefinition[];
}

const semanticAssetIdPattern = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;
const mediaTypePattern = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i;

function isSafeObjectPath(path: string): boolean {
  if (!path || path !== path.trim() || path.startsWith("/") || path.endsWith("/")) return false;
  if (path.includes("\\") || path.includes("?") || path.includes("#") || path.includes("://")) {
    return false;
  }
  return path
    .split("/")
    .every((segment) => segment.length > 0 && segment !== "." && segment !== "..");
}

function parseAssetDefinition(value: unknown, index: number): RuntimeAssetDefinition {
  if (value === null || typeof value !== "object") {
    throw new RangeError(`Runtime asset manifest entry ${index} must be an object.`);
  }

  const candidate = value as {
    id?: unknown;
    path?: unknown;
    mediaType?: unknown;
    version?: unknown;
  };
  if (typeof candidate.id !== "string" || !semanticAssetIdPattern.test(candidate.id)) {
    throw new RangeError(`Runtime asset manifest entry ${index} has an invalid semantic id.`);
  }
  if (typeof candidate.path !== "string" || !isSafeObjectPath(candidate.path)) {
    throw new RangeError(`Runtime asset ${candidate.id} has an unsafe object path.`);
  }
  if (typeof candidate.mediaType !== "string" || !mediaTypePattern.test(candidate.mediaType)) {
    throw new RangeError(`Runtime asset ${candidate.id} has an invalid media type.`);
  }
  if (!Number.isSafeInteger(candidate.version) || (candidate.version as number) < 1) {
    throw new RangeError(`Runtime asset ${candidate.id} has an invalid version.`);
  }

  return {
    id: candidate.id,
    path: candidate.path,
    mediaType: candidate.mediaType,
    version: candidate.version as number,
  };
}

export function parseRuntimeAssetManifest(value: unknown): RuntimeAssetManifest {
  if (value === null || typeof value !== "object") {
    throw new RangeError("Runtime asset manifest must be an object.");
  }

  const candidate = value as { schemaVersion?: unknown; assets?: unknown };
  if (candidate.schemaVersion !== FANTASIA_RUNTIME_ASSET_MANIFEST_SCHEMA_VERSION) {
    throw new RangeError("Unsupported runtime asset manifest schema version.");
  }
  if (!Array.isArray(candidate.assets)) {
    throw new RangeError("Runtime asset manifest assets must be an array.");
  }

  const assets = candidate.assets.map(parseAssetDefinition);
  const ids = new Set<string>();
  const paths = new Set<string>();
  for (const asset of assets) {
    if (ids.has(asset.id)) throw new RangeError(`Duplicate runtime asset id: ${asset.id}.`);
    if (paths.has(asset.path)) {
      throw new RangeError(`Duplicate runtime asset path: ${asset.path}.`);
    }
    ids.add(asset.id);
    paths.add(asset.path);
  }

  return {
    schemaVersion: FANTASIA_RUNTIME_ASSET_MANIFEST_SCHEMA_VERSION,
    assets,
  };
}

export class RuntimeAssetResolver {
  readonly #baseUrl: string;
  readonly #assets: ReadonlyMap<string, RuntimeAssetDefinition>;

  constructor(manifest: RuntimeAssetManifest, baseUrl: string) {
    const normalizedBase = baseUrl.trim().replace(/\/+$/, "");
    if (!normalizedBase) throw new RangeError("Runtime asset base URL must not be empty.");
    this.#baseUrl = normalizedBase;
    this.#assets = new Map(manifest.assets.map((asset) => [asset.id, asset]));
  }

  definition(assetId: string): RuntimeAssetDefinition {
    const asset = this.#assets.get(assetId);
    if (!asset) throw new RangeError(`Unknown runtime asset id: ${assetId}.`);
    return asset;
  }

  resolve(assetId: string): string {
    const asset = this.definition(assetId);
    const encodedPath = asset.path.split("/").map(encodeURIComponent).join("/");
    return `${this.#baseUrl}/${encodedPath}`;
  }
}

export function createRuntimeAssetResolver(
  manifestValue: unknown,
  baseUrl: string,
): RuntimeAssetResolver {
  return new RuntimeAssetResolver(parseRuntimeAssetManifest(manifestValue), baseUrl);
}
