import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public routes (Share links, auth endpoints, static assets, broker session claim, extension version/download)
  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/share") ||
    pathname.startsWith("/api/share") ||
    pathname.startsWith("/api/preview-proxy") ||
    pathname.startsWith("/api/extension") ||
    pathname === "/api/broker/session" ||
    pathname === "/api/broker/session-check" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/login" ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Transparent Reverse Proxy Bridge: Rewrite root WordPress requests to active project proxy
  if (
    pathname.startsWith("/wp-admin") ||
    pathname.startsWith("/wp-json") ||
    pathname.startsWith("/wp-content") ||
    pathname.startsWith("/wp-includes") ||
    pathname.startsWith("/wp-sitemap") ||
    pathname === "/wp-cron.php" ||
    pathname === "/xmlrpc.php" ||
    pathname === "/wp-login.php" ||
    req.nextUrl.searchParams.has("rest_route")
  ) {
    const referer = req.headers.get("referer") || "";
    const projectId =
      req.cookies.get("vanguard_active_proxy_project")?.value ||
      req.cookies.get("reno_active_proxy_project")?.value ||
      referer.match(/\/api\/proxy\/([a-zA-Z0-9_-]+)/)?.[1];

    if (projectId) {
      const rewriteUrl = new URL(`/api/proxy/${projectId}${pathname}${req.nextUrl.search}`, req.url);
      return NextResponse.rewrite(rewriteUrl);
    }
  }

  // Retrieve JWT session token
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development-only-32chars",
  });

  // If not authenticated, return 401 for API routes or redirect to login for UI pages
  if (!token) {
    // Allow share token scoped API requests through to route handlers for cryptographic DB verification
    const hasShareToken =
      req.headers.has("x-share-token") ||
      req.nextUrl.searchParams.has("token") ||
      req.nextUrl.searchParams.has("shareToken");

    if (
      hasShareToken &&
      (pathname.startsWith("/api/comments") || pathname.startsWith("/api/upload"))
    ) {
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Unauthorized. Authentication required.", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Route protection for Admin Hub (/admin/*, /projects/*, /team/*, /audit/*, /api/admin/*)
  // Exception: /projects/[id]/tasks is accessible to both ADMIN and DEVELOPER
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/audit") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/api/admin")
  ) {
    const isTaskRoute = pathname.includes("/tasks");
    if (isTaskRoute) {
      if (token.role !== "ADMIN" && token.role !== "DEVELOPER") {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    } else if (token.role !== "ADMIN") {
      // Non-admins cannot access admin hub; redirect to developer portal
      return NextResponse.redirect(new URL("/developer", req.url));
    }
  }

  // Route protection for Developer Workspace (/developer/*)
  if (pathname.startsWith("/developer")) {
    // Both ADMIN and DEVELOPER can access developer views
    if (token.role !== "ADMIN" && token.role !== "DEVELOPER") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/projects/:path*",
    "/team/:path*",
    "/audit/:path*",
    "/profile/:path*",
    "/developer/:path*",
    "/preview/:path*",
    "/api/projects/:path*",
    "/api/broker/:path*",
    "/api/comments/:path*",
    "/api/proxy/:path*",
    "/api/admin/:path*",
    "/api/team/:path*",
    "/api/developer/:path*",
    "/api/clients/:path*",
    "/api/profile/:path*",
    "/api/upload/:path*",
    "/api/notifications/:path*",
    "/api/analytics/:path*",
    "/wp-admin/:path*",
    "/wp-json/:path*",
    "/wp-content/:path*",
    "/wp-includes/:path*",
    "/wp-sitemap/:path*",
    "/wp-cron.php",
    "/xmlrpc.php",
    "/wp-login.php",
  ],
};
