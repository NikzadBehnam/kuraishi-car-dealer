import { notFound } from "next/navigation";

import { getStaffVehicle } from "@/lib/inventory-queries";
import { VehicleForm } from "../../_components/vehicle-form";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await getStaffVehicle(id);

  if (!vehicle) notFound();

  return <VehicleForm mode="edit" vehicle={vehicle} />;
}
