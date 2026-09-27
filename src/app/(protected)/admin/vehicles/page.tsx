import { redirect } from "next/navigation";

import {
  buildAdminVehicleListingHref,
  parseAdminVehicleListingSearchParams,
} from "@/features/vehicles/admin-listing-search-params.ts";
import { listAdminVehicles } from "@/features/vehicles/server/admin-queries.ts";

import { VehicleInventoryTable } from "./_components/vehicle-inventory-table";

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseAdminVehicleListingSearchParams(await searchParams);
  const result = await listAdminVehicles(query);
  const lastPage = Math.max(1, result.totalPages);

  if (query.page > lastPage) {
    redirect(buildAdminVehicleListingHref(query, lastPage));
  }

  return (
    <VehicleInventoryTable
      key={buildAdminVehicleListingHref(query)}
      query={query}
      result={result}
    />
  );
}
