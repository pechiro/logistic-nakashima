"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  createSessionToken,
  hashPassword,
  sessionCookieOptions,
  verifyPassword,
  verifySessionToken,
} from "@/lib/auth";
import {
  isSupabaseAuthConfigured,
  usernameToEmail,
  verifyWithSupabase,
} from "@/lib/supabase-auth";

export type LoginResult = { error: string };

/** Only allow same-app relative paths as the post-login destination. */
function safeNext(next: string | null): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/";
}

// Team members log in with a bare username (no email — see src/lib/auth.ts).
// The house internal-email domain; a value typed as "cucho@nakashima.pe" is
// folded back to the stored username "cucho" so either form logs in seamlessly.
const HOUSE_EMAIL_DOMAIN = "@nakashima.pe";

/** Normalize a submitted login identifier to the stored username form. */
function normalizeUsername(raw: string): string {
  const value = raw.trim().toLowerCase();
  return value.endsWith(HOUSE_EMAIL_DOMAIN)
    ? value.slice(0, -HOUSE_EMAIL_DOMAIN.length)
    : value;
}

export async function login(
  _prevState: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const raw = ((formData.get("username") as string | null) ?? "").trim();
  const password = (formData.get("password") as string | null) ?? "";
  const next = safeNext(formData.get("next") as string | null);

  if (!raw || !password) {
    return { error: "Ingresa tu usuario y contraseña." };
  }

  // The identity stored in the session + User table: bare, lowercase, no domain.
  const username = normalizeUsername(raw);

  let authed = false;

  // 1) Supabase Auth first (when configured) so any account created in the
  //    Supabase Dashboard can sign in. A bare username becomes <name>@nakashima.pe.
  if (isSupabaseAuthConfigured()) {
    const result = await verifyWithSupabase(usernameToEmail(raw), password);
    if (result.ok) {
      authed = true;
      // Lazily mirror the account into the local User table as a profile.
      await ensureProfile(username);
    }
  }

  // 2) Fallback: the existing local scrypt check, so cucho and any pre-Supabase
  //    users keep working during the migration. Verify even when the user is
  //    missing to avoid leaking which half was wrong and keep timing uniform.
  if (!authed) {
    const user = await prisma.user.findUnique({ where: { username } });
    authed = user
      ? verifyPassword(password, user.passwordHash)
      : (verifyPassword(password, "00:00"), false);
  }

  if (!authed) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(username), sessionCookieOptions());

  redirect(next);
}

/**
 * Lazily create a local profile row for a Supabase-authenticated user on first
 * login. `passwordHash` is NOT NULL, so a new profile gets a random, unusable
 * hash — the real credential lives in Supabase, and the local scrypt fallback
 * can never match this placeholder. An existing row is left untouched.
 */
async function ensureProfile(username: string): Promise<void> {
  await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username, passwordHash: hashPassword(randomBytes(24).toString("hex")) },
  });
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}

/**
 * Slide the session's expiry forward. Called by the client idle watcher while
 * the user is actually interacting with the page.
 *
 * Renewal is deliberately tied to *user activity* rather than to any incoming
 * request: `AutoRefresh` polls the server every 5 seconds, so renewing inside
 * proxy.ts would keep an abandoned tab logged in indefinitely. The cookie is
 * httpOnly, so only the server can re-issue it.
 */
export async function touchSession(): Promise<void> {
  const cookieStore = await cookies();
  const username = verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
  // Already expired: leave it dead — the next request gets bounced by the proxy.
  if (!username) return;
  cookieStore.set(SESSION_COOKIE, createSessionToken(username), sessionCookieOptions());
}

/**
 * Sign out after the idle timeout, landing on the login screen with a note
 * explaining why. Kept separate from `logout()` because that one is used as a
 * `<form action>`, which would pass FormData into any parameter we added here.
 */
export async function expireSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login?expired=1");
}
