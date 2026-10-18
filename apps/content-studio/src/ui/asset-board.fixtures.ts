import type { AssetBoardRecord } from "./asset-board";

export const assetBoardLabFixtures: readonly AssetBoardRecord[] = [
  {
    semanticId: "character.example.portrait.base",
    role: "Portrait",
    variant: "base",
    lifecycle: "APPROVED",
    derivativeRequired: true,
    currentVersion: {
      semanticAssetId: "character.example.portrait.base",
      versionId: "asset-version.example.portrait.v3",
      versionNumber: 3,
      providerKind: "drive",
      sourceAvailable: true,
      mediaType: "image/png",
      byteSize: 4821932,
      dimensions: { width: 2400, height: 3200 },
      checksum: { algorithm: "sha256", value: "example-checksum-v3" },
      providerReference: { visibility: "redacted" },
      operations: ["metadata", "preview"],
      provenance: {
        authority: "provider",
        source: "drive",
        observedAt: "2026-10-18T04:00:00Z",
      },
    },
    versions: [
      {
        versionId: "asset-version.example.portrait.v1",
        versionNumber: 1,
        lifecycle: "RETIRED",
        current: false,
        createdAt: "2026-10-12T11:00:00Z",
        summary: "Original retained source/master version.",
      },
      {
        versionId: "asset-version.example.portrait.v2",
        versionNumber: 2,
        lifecycle: "RETIRED",
        current: false,
        createdAt: "2026-10-15T09:30:00Z",
        summary: "Prior accepted correction retained in history.",
      },
      {
        versionId: "asset-version.example.portrait.v3",
        versionNumber: 3,
        lifecycle: "APPROVED",
        current: true,
        createdAt: "2026-10-18T03:45:00Z",
        summary: "Current source/master version.",
      },
    ],
    runtimeDerivatives: [
      {
        semanticId: "character.example.portrait.base.runtime.webp",
        assetId: "character.example.portrait.base",
        mediaType: "image/webp",
        outputFormat: "webp",
        runtimePath: "characters/example/portrait-base.webp",
        technicalState: "READY",
        manifestMapped: true,
        acceptedRuntimePath: "characters/example/portrait-base.webp",
      },
    ],
    relations: [
      {
        type: "used-by",
        targetSemanticId: "character.example",
        targetLabel: "Example Character",
      },
      {
        type: "alternate-of",
        targetSemanticId: "character.example.portrait.unleashed",
        targetLabel: "Unleashed portrait",
      },
    ],
    issues: [
      {
        code: "provider-reference-redacted",
        severity: "warning",
        message: "Provider reference is intentionally redacted in this fixture.",
      },
    ],
  },
  {
    semanticId: "character.example.battle-sprite.base",
    role: "Battle sprite",
    variant: "base",
    lifecycle: "WORKING",
    derivativeRequired: true,
    currentVersion: null,
    runtimeDerivatives: [],
    relations: [],
    versions: [],
    issues: [
      {
        code: "current-version-missing",
        severity: "blocking",
        message: "Semantic asset has no valid current version.",
      },
    ],
  },
];
