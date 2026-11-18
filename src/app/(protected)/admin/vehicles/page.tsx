import { listStaffVehicles } from "@/lib/inventory-queries";
import { VehicleInventoryTable } from "./_components/vehicle-inventory-table";

export default async function AdminVehiclesPage() {
  const { items, total } = await listStaffVehicles({ pageSize: 100 });
  return <VehicleInventoryTable vehicles={items} total={total} />;
}
