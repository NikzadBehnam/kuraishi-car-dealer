import type { MetadataRoute } from "next";
import { publicRoutes, routeBuilders } from "@/config/routes.config";
import { siteConfig } from "@/config/site.config";
import { listPublicVehicleSitemapEntries } from "@/features/vehicles/server/public-queries.ts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const vehicles = await listPublicVehicleSitemapEntries();

  return [
    ...Object.values(publicRoutes).map((route) => ({
      url: `${base}${route}`,
    })),
    ...vehicles.map((vehicle) => ({
      url: `${base}${routeBuilders.vehicleDetails(vehicle.slug)}`,
      lastModified: new Date(vehicle.updatedAt),
    })),
  ];
}
