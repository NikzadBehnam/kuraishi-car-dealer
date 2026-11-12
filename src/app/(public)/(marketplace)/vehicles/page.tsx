import { PageHeader } from "@/components/layout/page-header";
import { VehicleSearchResults } from "./_components/vehicle-search-results";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import { vehicles } from "@/data/vehicles";
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
  const initialQuery = typeof params.q === "string" ? params.q : "";
  return (
    <>
      <PageHeader
        title={content.title}
        description={content.description}
        breadcrumb="Fahrzeuge"
      />
      <VehicleSearchResults
        key={initialQuery}
        vehicles={vehicles}
        initialQuery={initialQuery}
      />
    </>
  );
}
