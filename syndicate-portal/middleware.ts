import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/constants";

const protectedRoutes = [
  "/dashboard",
  "/business-profile",
  "/agent-mode",
  "/audit-log",
  "/billing",
  "/change-password",
  "/internal-admin"
];

const buildRedirectUrl = (request: NextRequest, pathname: string): URL => {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "") || "https";

  return new URL(pathname, `${protocol}://${host}`);
};

export function middleware(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (isProtected && !token) {
    return NextResponse.redirect(buildRedirectUrl(request, "/login"));
  }

  if (pathname === "/login" && token) {
    return NextResponse.redirect(buildRedirectUrl(request, "/dashboard"));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/business-profile/:path*",
    "/agent-mode/:path*",
    "/audit-log/:path*",
    "/billing/:path*",
    "/change-password/:path*",
    "/internal-admin/:path*",
    "/login"
  ]
};
