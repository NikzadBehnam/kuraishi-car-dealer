import { NextRequest, NextResponse } from "next/server";

import {
  internalRoutes,
  localizedRouteMappings,
  publicRoutes,
} from "@/config/routes.config";
import {
  adminRequestPathHeader,
  isAdminPath,
} from "@/lib/auth/admin-route-policy";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAdminPath(pathname)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(
      adminRequestPathHeader,
      `${pathname}${request.nextUrl.search}`,
    );

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (pathname.startsWith(`${publicRoutes.vehicles}/`)) {
    const slug = pathname.slice(publicRoutes.vehicles.length + 1);
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `${internalRoutes.vehicles}/${slug}`;
    return NextResponse.rewrite(rewriteUrl);
  }

  if (pathname.startsWith(`${internalRoutes.vehicles}/`)) {
    const slug = pathname.slice(internalRoutes.vehicles.length + 1);
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = `${publicRoutes.vehicles}/${slug}`;
    return NextResponse.redirect(redirectUrl, 308);
  }

  const publicMapping = localizedRouteMappings.find(
    (mapping) => mapping.publicPath === pathname,
  );
  if (
    publicMapping &&
    publicMapping.publicPath !== publicMapping.internalPath
  ) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = publicMapping.internalPath;
    return NextResponse.rewrite(rewriteUrl);
  }

  const internalMapping = localizedRouteMappings.find(
    (mapping) => mapping.internalPath === pathname,
  );
  if (
    internalMapping &&
    internalMapping.publicPath !== internalMapping.internalPath
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = internalMapping.publicPath;
    return NextResponse.redirect(redirectUrl, 308);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|fonts|assets|.*\\..*).*)",
  ],
};
