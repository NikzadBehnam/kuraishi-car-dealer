import type { MetadataRoute } from "next";
import { publicRoutes, routeBuilders } from "@/config/routes.config";
import { siteConfig } from "@/config/site.config";
import { listPublicVehicleSitemapEntries } from "@/lib/inventory-queries";

const sitemapPageSize = 100;

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.canonicalOrigin;
  const firstPage = await listPublicVehicleSitemapEntries({
    page: 1,
    pageSize: sitemapPageSize,
  });
  const entries = [...firstPage.items];

  for (let page = 2; page <= firstPage.totalPages; page += 1) {
    const result = await listPublicVehicleSitemapEntries({
      page,
      pageSize: sitemapPageSize,
    });
    entries.push(...result.items);
  }

  return [
    ...Object.values(publicRoutes).map((route) => ({
      url: `${base}${route}`,
    })),
    ...entries.map(({ slug, updatedAt }) => ({
      url: `${base}${routeBuilders.vehicleDetails(slug)}`,
      lastModified: new Date(updatedAt),
    })),
  ];
}
