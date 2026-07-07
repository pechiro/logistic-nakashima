import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Minimal auth primitives — password hashing and a signed session cookie —
 * built on Node's crypto so there are no extra dependencies to install.
 * Pure (no `next/*` imports) so it can be shared by proxy.ts and server actions.
 */

export const SESSION_COOKIE = "stockroom_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

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

/** A session token is `base64url(username).hmac` — self-contained, no store. */
export function createSessionToken(username: string): string {
  const payload = Buffer.from(username).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Verify a token's signature and return the username, or null if invalid. */
export function verifySessionToken(token: string | undefined): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return Buffer.from(payload, "base64url").toString("utf8");
}

/** Options for the session cookie (shared by set + delete). */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
  };
}
