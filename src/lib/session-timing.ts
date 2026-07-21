/**
 * Idle-session timings, shared by the server (`auth.ts`, `proxy.ts`) and the
 * client-side idle watcher. Kept in its own module — free of `node:crypto` —
 * so importing it from a client component doesn't drag Node builtins into the
 * browser bundle.
 */

/** How long a user may sit completely idle before the session is dropped. */
export const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour

/** How often a client that *is* being used re-issues its session cookie. */
export const ACTIVITY_PING_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Server-side lifetime of a session token: the idle window plus one ping
 * interval. The grace matters — a client that pinged just before the user
 * walked away still holds a token that outlives the full idle window, so the
 * server never expires a session *earlier* than IDLE_TIMEOUT_MS after the last
 * real interaction.
 */
export const SESSION_TTL_MS = IDLE_TIMEOUT_MS + ACTIVITY_PING_INTERVAL_MS;
