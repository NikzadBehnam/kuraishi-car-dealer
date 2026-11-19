import { NextRequest, NextResponse } from "next/server";

import { getLocalizedRouteChange } from "@/lib/localized-route";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const routeChange = getLocalizedRouteChange(request.nextUrl);

  if (routeChange?.kind === "rewrite") {
    return NextResponse.rewrite(routeChange.url);
  }
  if (routeChange?.kind === "redirect") {
    return NextResponse.redirect(routeChange.url, 308);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // Lets the admin layout build a safe post-login return path; not an auth check.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-return-path", `${pathname}${request.nextUrl.search}`);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/fahrzeuge/:path*",
    "/vehicles/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|images|fonts|assets|.*\\..*).*)",
  ],
};
