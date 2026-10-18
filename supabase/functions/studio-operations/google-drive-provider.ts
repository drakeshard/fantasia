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

export type GoogleDriveOAuthTokens = {
  readonly accessToken: string;
  readonly refreshToken: string;
};

export type GoogleDriveAccount = {
  readonly email: string;
  readonly displayName: string | null;
};

export type GoogleDriveSourceFolders = {
  readonly rootFolderId: string;
  readonly productionAssetsFolderId: string;
  readonly sourceMastersFolderId: string;
};

export class GoogleDriveProviderError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "GoogleDriveProviderError";
    this.status = status;
  }
}

function googleOAuthClient(): { clientId: string; clientSecret: string } {
  const clientId = Deno.env.get("STUDIO_GOOGLE_OAUTH_CLIENT_ID")?.trim();
  const clientSecret = Deno.env.get("STUDIO_GOOGLE_OAUTH_CLIENT_SECRET")?.trim();
  if (!clientId || !clientSecret) {
    throw new GoogleDriveProviderError(
      "Google Drive OAuth is not configured on the Studio operation service.",
      503,
    );
  }
  return { clientId, clientSecret };
}

export function googleDriveOAuthAuthorizationUrl(state: string, redirectUri: string): string {
  const { clientId } = googleOAuthClient();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/drive.file");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

async function tokenResponse(body: URLSearchParams): Promise<Record<string, unknown>> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !payload) {
    const detail = typeof payload?.error_description === "string" ? ` ${payload.error_description}` : "";
    throw new GoogleDriveProviderError(`Google Drive OAuth token exchange failed.${detail}`, 503);
  }
  return payload;
}

export async function exchangeGoogleDriveAuthorizationCode(
  code: string,
  redirectUri: string,
): Promise<GoogleDriveOAuthTokens> {
  const { clientId, clientSecret } = googleOAuthClient();
  const payload = await tokenResponse(new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  }));
  if (typeof payload.access_token !== "string" || typeof payload.refresh_token !== "string") {
    throw new GoogleDriveProviderError(
      "Google Drive did not return the required offline refresh token. Reconnect and grant consent again.",
      409,
    );
  }
  return { accessToken: payload.access_token, refreshToken: payload.refresh_token };
}

export async function refreshGoogleDriveAccessToken(refreshToken: string): Promise<string> {
  const { clientId, clientSecret } = googleOAuthClient();
  const payload = await tokenResponse(new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  }));
  if (typeof payload.access_token !== "string") {
    throw new GoogleDriveProviderError("Google Drive refresh-token exchange returned no access token.", 503);
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

async function driveJson(
  url: string,
  accessToken: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const response = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !body) {
    const error = body?.error as { message?: unknown } | undefined;
    const message = typeof error?.message === "string" ? error.message : "Google Drive request failed.";
    throw new GoogleDriveProviderError(message, response.status === 404 ? 404 : 502);
  }
  return body;
}

export async function readGoogleDriveAccount(accessToken: string): Promise<GoogleDriveAccount> {
  const body = await driveJson(
    "https://www.googleapis.com/drive/v3/about?fields=user(emailAddress,displayName)",
    accessToken,
  );
  const user = body.user as Record<string, unknown> | undefined;
  if (typeof user?.emailAddress !== "string" || !user.emailAddress.trim()) {
    throw new GoogleDriveProviderError("Connected Google Drive account did not expose an email address.", 502);
  }
  return {
    email: user.emailAddress.trim(),
    displayName: typeof user.displayName === "string" ? user.displayName : null,
  };
}

function escapeDriveQueryValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

async function findManagedDriveFolder(
  name: string,
  accessToken: string,
  parentId?: string,
): Promise<string | null> {
  const escapedName = escapeDriveQueryValue(name);
  const parent = parentId ? `'${escapeDriveQueryValue(parentId)}'` : "'root'";
  const query = [
    `${parent} in parents`,
    `name = '${escapedName}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    "appProperties has { key='fantasiaContentStudio' and value='source-master' }",
  ].join(" and ");
  const body = await driveJson(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=2&spaces=drive`,
    accessToken,
  );
  if (!Array.isArray(body.files) || body.files.length === 0) return null;
  if (body.files.length > 1) {
    throw new GoogleDriveProviderError(
      `Google Drive contains duplicate Studio-managed ${name} folders. Resolve the duplicates before reconnecting.`,
      409,
    );
  }
  const folder = body.files[0] as Record<string, unknown>;
  if (typeof folder.id !== "string") throw new GoogleDriveProviderError("Google Drive folder lookup returned no file ID.");
  return folder.id;
}

async function createDriveFolder(
  name: string,
  accessToken: string,
  parentId?: string,
): Promise<string> {
  const body = await driveJson(
    "https://www.googleapis.com/drive/v3/files?fields=id&supportsAllDrives=true",
    accessToken,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
        ...(parentId ? { parents: [parentId] } : {}),
        appProperties: { fantasiaContentStudio: "source-master" },
      }),
    },
  );
  if (typeof body.id !== "string") throw new GoogleDriveProviderError("Google Drive folder creation returned no file ID.");
  return body.id;
}

async function ensureManagedDriveFolder(
  name: string,
  accessToken: string,
  parentId?: string,
): Promise<string> {
  return await findManagedDriveFolder(name, accessToken, parentId) ??
    await createDriveFolder(name, accessToken, parentId);
}

export async function createGoogleDriveSourceFolders(accessToken: string): Promise<GoogleDriveSourceFolders> {
  const rootFolderId = await ensureManagedDriveFolder("Fantasia", accessToken);
  const productionAssetsFolderId = await ensureManagedDriveFolder("Production Assets", accessToken, rootFolderId);
  const sourceMastersFolderId = await ensureManagedDriveFolder("Source Masters", accessToken, productionAssetsFolderId);
  return { rootFolderId, productionAssetsFolderId, sourceMastersFolderId };
}

async function driveMetadata(fileId: string, accessToken: string): Promise<DriveFileMetadata> {
  return await driveJson(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(metadataFields)}&supportsAllDrives=true`,
    accessToken,
  ) as DriveFileMetadata;
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
  if (
    typeof metadata.name !== "string" ||
    typeof metadata.mimeType !== "string" ||
    typeof metadata.modifiedTime !== "string"
  ) {
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
    observedAt: metadata.modifiedTime,
  };
}

async function findDriveUploadByTag(
  folderId: string,
  tag: string,
  accessToken: string,
): Promise<DriveFileMetadata | null> {
  const escapedFolder = escapeDriveQueryValue(folderId);
  const escapedTag = escapeDriveQueryValue(tag);
  const query = `'${escapedFolder}' in parents and trashed = false and appProperties has { key='studioOperation' and value='${escapedTag}' }`;
  const body = await driveJson(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(`files(${metadataFields})`)}&pageSize=2&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    accessToken,
  );
  if (!Array.isArray(body.files) || body.files.length === 0) return null;
  if (body.files.length > 1) {
    throw new GoogleDriveProviderError("Google Drive contains duplicate files for one Studio upload operation.", 409);
  }
  return body.files[0] as DriveFileMetadata;
}

export async function inspectGoogleDriveFile(
  reference: string,
  accessToken: string,
): Promise<GoogleDriveSourceMetadata> {
  const fileId = parseGoogleDriveFileId(reference);
  const metadata = await driveMetadata(fileId, accessToken);
  const bytes = await driveBytes(fileId, accessToken);
  return sourceMetadata(fileId, metadata, bytes);
}

export async function uploadGoogleDriveFile(
  file: File,
  studioOperationKey: string,
  folderId: string,
  accessToken: string,
): Promise<GoogleDriveSourceMetadata> {
  if (file.size < 1) throw new GoogleDriveProviderError("Source file is empty.", 400);
  if (!folderId.trim()) throw new GoogleDriveProviderError("Google Drive source folder is not configured.", 503);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const incomingChecksum = await sha256Hex(bytes);
  const tag = await requestTag(studioOperationKey);
  const existing = await findDriveUploadByTag(folderId, tag, accessToken);
  if (existing && typeof existing.id === "string") {
    const existingBytes = await driveBytes(existing.id, accessToken);
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
        authorization: `Bearer ${accessToken}`,
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
  accessToken: string,
): Promise<{ readonly metadata: DriveFileMetadata; readonly bytes: Uint8Array }> {
  const metadata = await driveMetadata(providerRef, accessToken);
  const bytes = await driveBytes(providerRef, accessToken);
  return { metadata, bytes };
}
