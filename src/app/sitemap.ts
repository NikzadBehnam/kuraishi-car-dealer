import type { MetadataRoute } from "next";
import { publicRoutes, routeBuilders } from "@/config/routes.config";
import { vehicles } from "@/data/vehicles";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://autowelt-rhein.example";
  return [
    ...Object.values(publicRoutes).map((route) => ({
      url: `${base}${route}`,
      lastModified: new Date(),
    })),
    ...vehicles.map((vehicle) => ({
      url: `${base}${routeBuilders.vehicleDetails(vehicle.slug)}`,
      lastModified: new Date(),
    })),
  ];
}
