import type { MetadataRoute } from "next";
import { internalRoutes, publicRoutes } from "@/config/routes.config";
import { siteConfig } from "@/config/site.config";
export default function robots(): MetadataRoute.Robots {
  const publicPaths = new Set<string>(Object.values(publicRoutes));
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin/",
        "/konto/",
        `${publicRoutes.vehicles}?`,
        ...Object.values(internalRoutes).filter(
          (path) => path !== "/" && !publicPaths.has(path),
        ),
      ],
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
