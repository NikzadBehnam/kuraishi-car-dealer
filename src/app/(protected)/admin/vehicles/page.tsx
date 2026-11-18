import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { adminRoutes } from "@/config/admin-routes.config";
import { listStaffVehicles } from "@/lib/inventory-queries";
import { staffInventorySearchParamsSchema } from "@/lib/inventory-validation";
import { VehicleInventoryTable } from "./_components/vehicle-inventory-table";

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsedFilters = staffInventorySearchParamsSchema.safeParse(
    await searchParams,
  );
  if (!parsedFilters.success) return <InvalidInventoryFilters />;
  const { page, ...filters } = parsedFilters.data;
  const result = await listStaffVehicles({
    ...filters,
    page,
  });
  const totalPages = Math.max(1, result.totalPages);
  if (page > totalPages) {
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.sort !== "lastUpdatedAt") params.set("sort", filters.sort);
    if (filters.direction !== "desc")
      params.set("direction", filters.direction);
    if (totalPages > 1) params.set("page", String(totalPages));
    const queryString = params.toString();
    redirect(
      queryString
        ? `${adminRoutes.vehicles}?${queryString}`
        : adminRoutes.vehicles,
    );
  }
  return (
    <VehicleInventoryTable
      key={filters.search}
      vehicles={result.items}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totalPages={totalPages}
      filters={filters}
    />
  );
}

function InvalidInventoryFilters() {
  return (
    <section
      role="alert"
      className="bg-surface grid justify-items-center gap-3 rounded-[var(--radius-sm)] border p-8 text-center"
    >
      <h2 className="text-xl font-extrabold">Invalid inventory filters</h2>
      <p className="text-muted-foreground max-w-lg text-sm">
        One or more search parameters are unsupported. Clear the filters and try
        again.
      </p>
      <Button asChild variant="outline">
        <Link href={adminRoutes.vehicles}>Clear filters</Link>
      </Button>
    </section>
  );
}
