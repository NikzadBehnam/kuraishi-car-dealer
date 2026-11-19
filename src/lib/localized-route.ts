import {
  internalRoutes,
  localizedRouteMappings,
  publicRoutes,
} from "../config/routes.config.ts";

type LocalizedRouteChange = {
  kind: "rewrite" | "redirect";
  url: URL;
};

function changePath(url: URL, pathname: string): URL {
  const result = new URL(url.toString());
  result.pathname = pathname;
  return result;
}

export function getLocalizedRouteChange(url: URL): LocalizedRouteChange | null {
  const { pathname } = url;

  if (pathname.startsWith(`${publicRoutes.vehicles}/`)) {
    const slug = pathname.slice(publicRoutes.vehicles.length + 1);
    return {
      kind: "rewrite",
      url: changePath(url, `${internalRoutes.vehicles}/${slug}`),
    };
  }

  if (pathname.startsWith(`${internalRoutes.vehicles}/`)) {
    const slug = pathname.slice(internalRoutes.vehicles.length + 1);
    return {
      kind: "redirect",
      url: changePath(url, `${publicRoutes.vehicles}/${slug}`),
    };
  }

  const publicMapping = localizedRouteMappings.find(
    (mapping) => mapping.publicPath === pathname,
  );
  if (
    publicMapping &&
    publicMapping.publicPath !== publicMapping.internalPath
  ) {
    return {
      kind: "rewrite",
      url: changePath(url, publicMapping.internalPath),
    };
  }

  const internalMapping = localizedRouteMappings.find(
    (mapping) => mapping.internalPath === pathname,
  );
  if (
    internalMapping &&
    internalMapping.publicPath !== internalMapping.internalPath
  ) {
    return {
      kind: "redirect",
      url: changePath(url, internalMapping.publicPath),
    };
  }

  return null;
}
