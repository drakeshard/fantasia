type GoogleServiceAccount = {
  readonly client_email: string;
  readonly private_key: string;
  readonly token_uri?: string;
};

export type GoogleDriveSourceMetadata = {
  readonly providerKind: "google-drive";
  readonly providerRef: string;
  readonly sourceName: string;
  readonly mediaType: string;
  readonly byteSize: number;
  readonly widthPx: number | null;
  readonly heightPx: number | null;
  readonly checksumAlgorithm: "sha256";
  readonly checksum: string;
  readonly observedAt: string;
};

export class GoogleDriveProviderError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "GoogleDriveProviderError";
    this.status = status;
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function textToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function pemToPkcs8(pem: string): ArrayBuffer {
  const normalized = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s+/g, "");
  let binary: string;
  try {
    binary = atob(normalized);
  } catch {
    throw new GoogleDriveProviderError("Google Drive service-account private key is invalid.", 503);
  }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function serviceAccount(): GoogleServiceAccount {
  const raw = Deno.env.get("STUDIO_GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON")?.trim();
  if (!raw) {
    throw new GoogleDriveProviderError(
      "Google Drive source provider is not configured on the Studio operation service.",
      503,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GoogleDriveProviderError("Google Drive service-account configuration is invalid.", 503);
  }
  if (!parsed || typeof parsed !== "object") {
    throw new GoogleDriveProviderError("Google Drive service-account configuration is invalid.", 503);
  }
  const record = parsed as Record<string, unknown>;
  if (typeof record.client_email !== "string" || typeof record.private_key !== "string") {
    throw new GoogleDriveProviderError("Google Drive service-account configuration is incomplete.", 503);
  }
  return {
    client_email: record.client_email,
    private_key: record.private_key,
    ...(typeof record.token_uri === "string" ? { token_uri: record.token_uri } : {}),
  };
}

async function googleAccessToken(): Promise<string> {
  const account = serviceAccount();
  const now = Math.floor(Date.now() / 1000);
  const tokenUri = account.token_uri ?? "https://oauth2.googleapis.com/token";
  const header = textToBase64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = textToBase64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/drive",
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signingInput = `${header}.${claims}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(account.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(signingInput),
    ),
  );
  const assertion = `${signingInput}.${bytesToBase64Url(signature)}`;
  const response = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const payload = await response.json().catch(() => null) as { access_token?: unknown; error_description?: unknown } | null;
  if (!response.ok || typeof payload?.access_token !== "string") {
    const detail = typeof payload?.error_description === "string" ? ` ${payload.error_description}` : "";
    throw new GoogleDriveProviderError(`Google Drive provider authentication failed.${detail}`, 503);
  }
  return payload.access_token;
}

export function parseGoogleDriveFileId(value: string): string {
  const trimmed = value.trim();
  if (/^[A-Za-z0-9_-]{10,200}$/.test(trimmed)) return trimmed;
  const patterns = [
    /\/file\/d\/([A-Za-z0-9_-]{10,200})/,
    /[?&]id=([A-Za-z0-9_-]{10,200})/,
    /\/d\/([A-Za-z0-9_-]{10,200})/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1];
  }
  throw new GoogleDriveProviderError("Google Drive file reference is invalid.", 400);
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function requestTag(value: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(value));
}

function dimensionsFromBytes(
  bytes: Uint8Array,
  mediaType: string,
): { widthPx: number; heightPx: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (mediaType === "image/png" && bytes.byteLength >= 24) {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (signature.every((value, index) => bytes[index] === value)) {
      return { widthPx: view.getUint32(16), heightPx: view.getUint32(20) };
    }
  }
  if (mediaType === "image/gif" && bytes.byteLength >= 10) {
    return { widthPx: view.getUint16(6, true), heightPx: view.getUint16(8, true) };
  }
  if (mediaType === "image/jpeg" && bytes.byteLength >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.byteLength) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1] ?? 0;
      if (marker === 0xd9 || marker === 0xda) break;
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.byteLength) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return {
          heightPx: view.getUint16(offset + 5),
          widthPx: view.getUint16(offset + 7),
        };
      }
      offset += 2 + length;
    }
  }
  if (mediaType === "image/webp" && bytes.byteLength >= 30) {
    const riff = new TextDecoder().decode(bytes.slice(0, 4));
    const webp = new TextDecoder().decode(bytes.slice(8, 12));
    if (riff === "RIFF" && webp === "WEBP") {
      const chunk = new TextDecoder().decode(bytes.slice(12, 16));
      if (chunk === "VP8X") {
        const width = 1 + bytes[24]! + (bytes[25]! << 8) + (bytes[26]! << 16);
        const height = 1 + bytes[27]! + (bytes[28]! << 8) + (bytes[29]! << 16);
        return { widthPx: width, heightPx: height };
      }
    }
  }
  return null;
}

type DriveFileMetadata = {
  readonly id?: unknown;
  readonly name?: unknown;
  readonly mimeType?: unknown;
  readonly size?: unknown;
  readonly modifiedTime?: unknown;
  readonly trashed?: unknown;
  readonly imageMediaMetadata?: { readonly width?: unknown; readonly height?: unknown };
};

const metadataFields = "id,name,mimeType,size,modifiedTime,trashed,imageMediaMetadata(width,height)";

async function driveMetadata(fileId: string, accessToken: string): Promise<DriveFileMetadata> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(metadataFields)}&supportsAllDrives=true`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  const body = await response.json().catch(() => null) as DriveFileMetadata | { error?: { message?: string } } | null;
  if (!response.ok) {
    const message = body && "error" in body && typeof body.error?.message === "string"
      ? body.error.message
      : "Google Drive file metadata could not be read.";
    throw new GoogleDriveProviderError(message, response.status === 404 ? 404 : 502);
  }
  return body as DriveFileMetadata;
}

async function driveBytes(fileId: string, accessToken: string): Promise<Uint8Array> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  if (!response.ok) {
    throw new GoogleDriveProviderError("Google Drive source bytes could not be read.", response.status === 404 ? 404 : 502);
  }
  return new Uint8Array(await response.arrayBuffer());
}

function metadataNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === "string" && /^\d+$/.test(value)) return Number(value);
  return null;
}

async function sourceMetadata(
  fileId: string,
  metadata: DriveFileMetadata,
  bytes: Uint8Array,
): Promise<GoogleDriveSourceMetadata> {
  if (metadata.trashed === true) throw new GoogleDriveProviderError("Google Drive source is trashed.", 409);
  if (typeof metadata.name !== "string" || typeof metadata.mimeType !== "string") {
    throw new GoogleDriveProviderError("Google Drive source metadata is incomplete.");
  }
  const declaredSize = metadataNumber(metadata.size);
  if (declaredSize !== null && declaredSize !== bytes.byteLength) {
    throw new GoogleDriveProviderError("Google Drive source size changed while it was being registered.", 409);
  }
  const providerWidth = metadataNumber(metadata.imageMediaMetadata?.width);
  const providerHeight = metadataNumber(metadata.imageMediaMetadata?.height);
  const parsedDimensions = dimensionsFromBytes(bytes, metadata.mimeType);
  return {
    providerKind: "google-drive",
    providerRef: fileId,
    sourceName: metadata.name,
    mediaType: metadata.mimeType,
    byteSize: bytes.byteLength,
    widthPx: providerWidth ?? parsedDimensions?.widthPx ?? null,
    heightPx: providerHeight ?? parsedDimensions?.heightPx ?? null,
    checksumAlgorithm: "sha256",
    checksum: await sha256Hex(bytes),
    observedAt: new Date().toISOString(),
  };
}

function escapeDriveQueryValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

async function findDriveUploadByTag(
  folderId: string,
  tag: string,
  accessToken: string,
): Promise<DriveFileMetadata | null> {
  const escapedFolder = escapeDriveQueryValue(folderId);
  const escapedTag = escapeDriveQueryValue(tag);
  const query = `'${escapedFolder}' in parents and trashed = false and appProperties has { key='studioOperation' and value='${escapedTag}' }`;
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(`files(${metadataFields})`)}&pageSize=2&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { authorization: `Bearer ${accessToken}` } },
  );
  const body = await response.json().catch(() => null) as { files?: unknown } | { error?: { message?: string } } | null;
  if (!response.ok) {
    const message = body && "error" in body && typeof body.error?.message === "string"
      ? body.error.message
      : "Google Drive idempotency lookup failed.";
    throw new GoogleDriveProviderError(message);
  }
  if (!body || !("files" in body) || !Array.isArray(body.files) || body.files.length === 0) return null;
  if (body.files.length > 1) {
    throw new GoogleDriveProviderError("Google Drive contains duplicate files for one Studio upload operation.", 409);
  }
  return body.files[0] as DriveFileMetadata;
}

export async function inspectGoogleDriveFile(reference: string): Promise<GoogleDriveSourceMetadata> {
  const fileId = parseGoogleDriveFileId(reference);
  const token = await googleAccessToken();
  const metadata = await driveMetadata(fileId, token);
  const bytes = await driveBytes(fileId, token);
  return sourceMetadata(fileId, metadata, bytes);
}

export async function uploadGoogleDriveFile(
  file: File,
  studioOperationKey: string,
): Promise<GoogleDriveSourceMetadata> {
  if (file.size < 1) throw new GoogleDriveProviderError("Source file is empty.", 400);
  const folderId = Deno.env.get("STUDIO_GOOGLE_DRIVE_SOURCE_FOLDER_ID")?.trim();
  if (!folderId) {
    throw new GoogleDriveProviderError(
      "Google Drive source upload folder is not configured on the Studio operation service.",
      503,
    );
  }
  const token = await googleAccessToken();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const incomingChecksum = await sha256Hex(bytes);
  const tag = await requestTag(studioOperationKey);
  const existing = await findDriveUploadByTag(folderId, tag, token);
  if (existing && typeof existing.id === "string") {
    const existingBytes = await driveBytes(existing.id, token);
    const existingSource = await sourceMetadata(existing.id, existing, existingBytes);
    if (
      existingSource.sourceName !== file.name ||
      existingSource.byteSize !== bytes.byteLength ||
      existingSource.checksum !== incomingChecksum
    ) {
      throw new GoogleDriveProviderError(
        "Studio upload idempotency key already belongs to different source bytes.",
        409,
      );
    }
    return existingSource;
  }

  const boundary = `fantasia-studio-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: file.name,
    parents: [folderId],
    appProperties: { studioOperation: tag },
  });
  const prefix = new TextEncoder().encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
  );
  const suffix = new TextEncoder().encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(prefix.length + bytes.length + suffix.length);
  body.set(prefix, 0);
  body.set(bytes, prefix.length);
  body.set(suffix, prefix.length + bytes.length);

  const response = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=${encodeURIComponent(metadataFields)}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );
  const uploaded = await response.json().catch(() => null) as DriveFileMetadata | { error?: { message?: string } } | null;
  if (!response.ok || !uploaded || typeof (uploaded as DriveFileMetadata).id !== "string") {
    const message = uploaded && "error" in uploaded && typeof uploaded.error?.message === "string"
      ? uploaded.error.message
      : "Google Drive source upload failed.";
    throw new GoogleDriveProviderError(message, 502);
  }
  const fileId = (uploaded as DriveFileMetadata).id as string;
  const result = await sourceMetadata(fileId, uploaded as DriveFileMetadata, bytes);
  if (result.checksum !== incomingChecksum) {
    throw new GoogleDriveProviderError("Google Drive upload checksum verification failed.", 409);
  }
  return result;
}

export async function readGoogleDriveSource(
  providerRef: string,
): Promise<{ readonly metadata: DriveFileMetadata; readonly bytes: Uint8Array }> {
  const token = await googleAccessToken();
  const metadata = await driveMetadata(providerRef, token);
  const bytes = await driveBytes(providerRef, token);
  return { metadata, bytes };
}
