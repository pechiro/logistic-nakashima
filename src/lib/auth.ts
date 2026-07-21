import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
// Relative, not "@/…": prisma/seed.ts imports this module outside Next, where
// the path alias doesn't resolve.
import { SESSION_TTL_MS } from "./session-timing";

/**
 * Minimal auth primitives — password hashing and a signed session cookie —
 * built on Node's crypto so there are no extra dependencies to install.
 * Pure (no `next/*` imports) so it can be shared by proxy.ts and server actions.
 */

export const SESSION_COOKIE = "stockroom_session";

// Demo app: a static fallback keeps it runnable out of the box. Set AUTH_SECRET
// in the environment to make sessions non-forgeable in any real deployment.
const SECRET = process.env.AUTH_SECRET ?? "stockroom-dev-secret-change-me";

// -- Passwords ---------------------------------------------------------------

/** Hash a password as `salt:hash` (both hex). scrypt is deliberately slow. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

/** Constant-time check of a password against a stored `salt:hash`. */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// -- Session token -----------------------------------------------------------

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

/**
 * A session token is `base64url(username).expiresAt.hmac` — self-contained, no
 * store. The expiry sits *inside* the signed payload, so a client can't extend
 * its own session by editing the cookie; only the server can mint a fresh one
 * (see `touchSession()` in app/login/actions.ts).
 */
export function createSessionToken(username: string): string {
  const payload = `${Buffer.from(username).toString("base64url")}.${Date.now() + SESSION_TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

/**
 * Verify a token's signature and expiry, returning the username — or null if
 * the token is missing, forged, malformed, or past its expiry.
 */
export function verifySessionToken(
  token: string | undefined,
  now: number = Date.now(),
): string | null {
  if (!token) return null;

  const signatureAt = token.lastIndexOf(".");
  if (signatureAt < 1) return null;
  const payload = token.slice(0, signatureAt);

  const actual = Buffer.from(token.slice(signatureAt + 1));
  const expected = Buffer.from(sign(payload));
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  // `payload` is `base64url(username).expiresAt`; the base64url alphabet never
  // contains a dot, so the first one always separates the two fields. A payload
  // with no dot is a pre-expiry token from an older release — reject it rather
  // than honour a session that would never time out.
  const expiryAt = payload.indexOf(".");
  if (expiryAt < 1) return null;

  const expiresAt = Number(payload.slice(expiryAt + 1));
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;

  return Buffer.from(payload.slice(0, expiryAt), "base64url").toString("utf8");
}

/** Options for the session cookie (shared by set + delete). */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    // Matches the token's own lifetime, so a browser that sat closed past the
    // idle window doesn't even send a cookie back.
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}
