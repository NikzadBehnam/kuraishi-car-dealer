import { notFound } from "next/navigation";

import { adminVehicles } from "@/data/admin";
import { VehicleForm } from "../../_components/vehicle-form";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = adminVehicles.find((item) => item.id === id);

  if (!vehicle) notFound();

  return <VehicleForm mode="edit" vehicle={vehicle} />;
}
