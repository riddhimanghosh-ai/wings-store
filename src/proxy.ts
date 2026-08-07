import { NextRequest, NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/orders") ||
    pathname.startsWith("/api/customers")
  ) {
    const token = req.cookies.get(ADMIN_SESSION_COOKIE)?.value;
    if (!verifyAdminSessionToken(token)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // The bare paths are listed alongside the `:path*` forms so that
  // /api/orders and /api/customers themselves are guarded, not just
  // their sub-routes.
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/orders",
    "/api/orders/:path*",
    "/api/customers",
    "/api/customers/:path*",
  ],
};
