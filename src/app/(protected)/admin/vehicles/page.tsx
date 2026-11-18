import Link from "next/link";

import { Button } from "@/components/ui/button";
import { adminRoutes } from "@/config/admin-routes.config";
import { listStaffVehicles } from "@/lib/inventory-queries";
import { staffInventoryFiltersSchema } from "@/lib/inventory-validation";
import { VehicleInventoryTable } from "./_components/vehicle-inventory-table";

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parsedFilters = staffInventoryFiltersSchema.safeParse(
    await searchParams,
  );
  if (!parsedFilters.success) return <InvalidInventoryFilters />;
  const filters = parsedFilters.data;
  const { items, total } = await listStaffVehicles({
    ...filters,
    pageSize: 100,
  });
  return (
    <VehicleInventoryTable
      key={filters.search}
      vehicles={items}
      total={total}
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
