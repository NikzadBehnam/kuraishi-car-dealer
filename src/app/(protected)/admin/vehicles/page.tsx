import { adminVehicles } from "@/data/admin";
import { VehicleInventoryTable } from "./_components/vehicle-inventory-table";

export default function AdminVehiclesPage() {
  return <VehicleInventoryTable vehicles={adminVehicles} />;
}
