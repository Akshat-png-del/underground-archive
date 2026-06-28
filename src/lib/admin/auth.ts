export const ADMIN_COOKIE = "archive-admin-session";

const SESSION_MESSAGE = "archive-admin-v1";

export function isAdminConfigured(): boolean {
  return !!process.env.ARCHIVE_ADMIN_SECRET?.trim();
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAdminSessionToken(secret: string): Promise<string> {
  return hmacSha256Hex(secret, SESSION_MESSAGE);
}

export async function verifyAdminSessionToken(token: string | undefined | null): Promise<boolean> {
  const secret = process.env.ARCHIVE_ADMIN_SECRET?.trim();
  if (!secret || !token) return false;
  const expected = await createAdminSessionToken(secret);
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function validateAdminPassword(password: string): boolean {
  const secret = process.env.ARCHIVE_ADMIN_SECRET?.trim();
  if (!secret) return false;
  return password === secret;
}
