import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

// Gate the whole app behind a valid session. `/login` is the only public route.
// Proxy runs on the Node.js runtime in Next 16, so the crypto in verifySessionToken works here.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthed = verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value) !== null;
  const isLogin = pathname === "/login";

  if (!isAuthed && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Remember where they were headed so we can return them after login.
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
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
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico)$).*)",
  ],
};
