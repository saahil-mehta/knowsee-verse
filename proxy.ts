import { headers } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Proxy for route protection (Next.js 16+).
 *
 * Enforces the "impenetrable wall" for email verification:
 * - Unauthenticated users → /login
 * - Authenticated but unverified users → /verify-email (cannot escape)
 * - Verified users → full app access
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Playwright health check
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Better Auth endpoints must be accessible
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Dynamic import to avoid module-level database connection
  const { auth } = await import("./lib/auth");

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isVerifyRoute = pathname.startsWith("/verify-email");

  // No session → must log in (unless already on auth pages)
  if (!session) {
    if (isAuthRoute) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Session but email not verified → THE WALL
  if (!session.user.emailVerified) {
    if (isVerifyRoute) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  // Verified user on auth/verify routes → redirect to app
  if (isAuthRoute || isVerifyRoute) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|icon|apple-icon|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
