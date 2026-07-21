import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Gate the whole app behind a valid session. `/login` is the only public route.
// Proxy runs on the Node.js runtime in Next 16, so the crypto in verifySessionToken works here.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  // Rejects forged *and* idle-expired tokens — the expiry is inside the payload.
  const isAuthed = verifySessionToken(token) !== null;
  const isLogin = pathname === "/login";

  if (!isAuthed && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Remember where they were headed so we can return them after login.
    if (pathname !== "/") url.searchParams.set("next", pathname);
    // A cookie that was sent but didn't verify means the session timed out (or
    // was tampered with). Say so on the login screen rather than bouncing them
    // with no explanation.
    if (token) url.searchParams.set("expired", "1");

    const response = NextResponse.redirect(url);
    // Stop the browser from replaying a dead cookie on every subsequent request.
    if (token) response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  if (isAuthed && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every route except Next internals and static assets. The trailing
  // extension group lets public/ image files (e.g. the login logo) load without
  // a session — otherwise the auth gate 307-redirects them to /login.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
