import { cookies } from "next/headers";
import { AUTH_CONFIG } from "./config";
import type { AuthAccount } from "./accounts";

export interface SessionData {
  userId: string;
  username: string;
  displayName: string;
  expiresAt: number;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "CRITICAL SECURITY CONFIGURATION ERROR: SESSION_SECRET must be defined in production. Application will not start with an unconfigured session secret."
      );
    }
    throw new Error(
      "SESSION_SECRET environment variable is missing. Please set SESSION_SECRET in your .env.local file."
    );
  }

  if (secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be at least 32 characters long for cryptographic security."
    );
  }

  return secret;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

async function getSigningKey(secret: string): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Creates a signed tamper-proof session token using Web Crypto HMAC-SHA256.
 */
export async function signSessionToken(session: SessionData): Promise<string> {
  const secret = getSessionSecret();
  const payloadJson = JSON.stringify(session);
  const payloadBase64 = bytesToBase64Url(textEncoder.encode(payloadJson));
  const key = await getSigningKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(payloadBase64)
  );
  const signatureBase64 = bytesToBase64Url(new Uint8Array(signatureBuffer));
  return `${payloadBase64}.${signatureBase64}`;
}

/**
 * Verifies the authenticity and expiration of a session token.
 */
export async function verifySessionToken(token: string): Promise<SessionData | null> {
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return null;
  }

  const [payloadBase64, signatureBase64] = parts;
  const secret = getSessionSecret();

  try {
    const key = await getSigningKey(secret);
    const signatureBytes = base64UrlToBytes(signatureBase64);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as BufferSource,
      textEncoder.encode(payloadBase64)
    );

    if (!isValid) {
      return null;
    }

    const payloadBytes = base64UrlToBytes(payloadBase64);
    const session = JSON.parse(textDecoder.decode(payloadBytes)) as SessionData;

    if (!session.expiresAt || Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Sets an HttpOnly, Secure, SameSite session cookie on the server.
 */
export async function createSession(account: AuthAccount): Promise<void> {
  const cookieStore = await cookies();
  const expiresAt = Date.now() + AUTH_CONFIG.SESSION_MAX_AGE_SECONDS * 1000;

  const sessionData: SessionData = {
    userId: account.id,
    username: account.username,
    displayName: account.displayName,
    expiresAt,
  };

  const token = await signSessionToken(sessionData);

  cookieStore.set(AUTH_CONFIG.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: AUTH_CONFIG.SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Retrieves and validates the current active session on the server.
 */
export async function getSession(): Promise<SessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_CONFIG.SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return await verifySessionToken(token);
}

/**
 * Destroys the server-side session cookie on logout.
 */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_CONFIG.SESSION_COOKIE_NAME);
}
