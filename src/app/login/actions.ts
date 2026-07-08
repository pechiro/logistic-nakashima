"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";

export type LoginResult = { error: string };

/** Only allow same-app relative paths as the post-login destination. */
function safeNext(next: string | null): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/";
}

export async function login(
  _prevState: LoginResult,
  formData: FormData,
): Promise<LoginResult> {
  const username = (formData.get("username") as string | null)?.trim() ?? "";
  const password = (formData.get("password") as string | null) ?? "";
  const next = safeNext(formData.get("next") as string | null);

  if (!username || !password) {
    return { error: "Ingresa tu usuario y contraseña." };
  }

  const user = await prisma.user.findUnique({ where: { username } });
  // Verify even when the user is missing to avoid leaking which half was wrong.
  const ok = user
    ? verifyPassword(password, user.passwordHash)
    : (verifyPassword(password, "00:00"), false);

  if (!ok) {
    return { error: "Usuario o contraseña incorrectos." };
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, createSessionToken(username), sessionCookieOptions());

  redirect(next);
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}
