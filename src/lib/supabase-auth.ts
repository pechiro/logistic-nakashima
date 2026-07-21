// Supabase Auth (GoTrue) password verification via REST — no @supabase/supabase-js
// dependency (Vercel installs from bun.lock; we avoid touching it). SERVER-ONLY.
//
// This app keeps its OWN session (src/lib/auth.ts + src/proxy.ts); Supabase is
// used only to *verify* credentials, so accounts created in the Supabase
// Dashboard can sign in. On success the login action mints the normal app cookie.

const HOUSE_EMAIL_DOMAIN = "@nakashima.pe";

/** Whether Supabase Auth env vars are present (project URL + anon key). */
export function isSupabaseAuthConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
}

/**
 * Turn a login identifier into the email GoTrue expects: a bare username gets
 * the house domain appended ("cucho" -> "cucho@nakashima.pe"); anything that
 * already contains "@" is used as-is.
 */
export function usernameToEmail(identifier: string): string {
  const value = identifier.trim().toLowerCase();
  return value.includes("@") ? value : `${value}${HOUSE_EMAIL_DOMAIN}`;
}

export type SupabaseVerifyResult = { ok: true; email: string } | { ok: false };

/**
 * Verify email+password against Supabase Auth. Returns ok ONLY on a clean 200
 * from the token endpoint; a wrong password, an unknown user, a misconfig, or a
 * network error all return { ok: false } so the caller falls back to the local
 * scrypt check — that graceful failure is what prevents any lockout.
 */
export async function verifyWithSupabase(
  email: string,
  password: string,
): Promise<SupabaseVerifyResult> {
  const baseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!baseUrl || !anonKey) return { ok: false };

  try {
    const res = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });
    // 200 = valid credentials. We don't keep Supabase's session (the app mints
    // its own cookie), so nothing else is needed from the response body.
    return res.ok ? { ok: true, email } : { ok: false };
  } catch {
    return { ok: false };
  }
}
