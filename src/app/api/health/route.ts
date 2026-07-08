import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// TEMPORARY diagnostic endpoint to debug the Vercel runtime 500. Runs one Prisma
// query and reports the exact error, plus non-secret fingerprints of the DB env
// vars (length + first/last chars only — never the password). REMOVE after use.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fingerprint(v: string | undefined) {
  if (!v) return { present: false };
  return {
    present: true,
    len: v.length,
    head: v.slice(0, 13), // "postgresql://" — no secret
    tail: JSON.stringify(v.slice(-8)), // e.g. "cer=true" / "postgres" — reveals stray \n or spaces
  };
}

export async function GET() {
  const env = {
    DATABASE_URL: fingerprint(process.env.DATABASE_URL),
    DIRECT_URL: fingerprint(process.env.DIRECT_URL),
    AUTH_SECRET_present: !!process.env.AUTH_SECRET,
  };
  try {
    const users = await prisma.user.count();
    return NextResponse.json({ ok: true, users, env });
  } catch (e) {
    const err = e as Error & { code?: string; clientVersion?: string };
    return NextResponse.json(
      {
        ok: false,
        name: err.name,
        code: err.code,
        clientVersion: err.clientVersion,
        message: err.message,
        env,
      },
      { status: 200 },
    );
  }
}
