import { PageHeader } from "@/components/layout/page-header";
import { VehicleSearchResults } from "./_components/vehicle-search-results";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import { vehicles } from "@/data/vehicles";
import type { VehicleFilters } from "@/lib/vehicle-filters";
import { createPublicMetadata } from "@/lib/metadata";
import { publicRoutes } from "@/config/routes.config";

export const metadata = createPublicMetadata(
  "Fahrzeuge",
  content.description,
  publicRoutes.vehicles,
);
export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialFilters: VehicleFilters = {
    make: typeof params.make === "string" ? params.make : undefined,
    model: typeof params.model === "string" ? params.model : undefined,
    bodyType: typeof params.bodyType === "string" ? params.bodyType : undefined,
    fuelType: typeof params.fuelType === "string" ? params.fuelType : undefined,
    location: typeof params.location === "string" ? params.location : undefined,
    maximumPrice:
      typeof params.maximumPrice === "string"
        ? Number(params.maximumPrice)
        : undefined,
  };
  return (
    <>
      <PageHeader
        title={content.title}
        description={content.description}
        breadcrumb="Fahrzeuge"
      />
      <VehicleSearchResults
        vehicles={vehicles}
        initialFilters={initialFilters}
      />
    </>
  );
}
