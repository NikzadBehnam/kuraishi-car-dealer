import { PageHeader } from "@/components/layout/page-header";
import { publicRoutes } from "@/config/routes.config";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import {
  buildPublicVehicleListingHref,
  parsePublicVehicleListingSearchParams,
} from "@/features/vehicles/listing-search-params.ts";
import { listPublicVehicles } from "@/features/vehicles/server/public-queries.ts";
import { createPublicMetadata } from "@/lib/metadata";
import { redirect } from "next/navigation";

import { VehicleSearchResults } from "./_components/vehicle-search-results";

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
  const query = parsePublicVehicleListingSearchParams(params);
  const result = await listPublicVehicles(query);
  const lastPage = Math.max(1, result.totalPages);

  if (query.page > lastPage) {
    redirect(buildPublicVehicleListingHref(query, lastPage));
  }

  return (
    <>
      <PageHeader
        title={content.title}
        description={content.description}
        breadcrumb="Fahrzeuge"
      />
      <VehicleSearchResults query={query} result={result} />
    </>
  );
}
