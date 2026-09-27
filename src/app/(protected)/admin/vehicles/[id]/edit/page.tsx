import { notFound } from "next/navigation";

import { resourceIdSchema } from "@/features/shared/schemas";
import { getAdminVehicleById } from "@/features/vehicles/server/admin-queries";
import { VehicleForm } from "../../_components/vehicle-form";

export default async function EditVehiclePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsedId = resourceIdSchema.safeParse(id);

  if (!parsedId.success) notFound();

  const vehicle = await getAdminVehicleById(parsedId.data);

  if (!vehicle) notFound();

  return <VehicleForm mode="edit" vehicle={vehicle} />;
}
