"use server";

import type {
  PublicInventoryVehicleDTO,
  PublicVehicleCardImageDTO,
} from "@/types/inventory";
import { getPublicComparisonVehicles } from "@/lib/inventory-queries";
import { listPublicVehicleCardImages } from "@/lib/media-attachments";

export async function resolvePublicComparison(ids: string[]): Promise<
  Array<{
    vehicle: PublicInventoryVehicleDTO;
    images: PublicVehicleCardImageDTO[];
  }>
> {
  const vehicles = await getPublicComparisonVehicles(ids);
  const imagesByVehicleId = await listPublicVehicleCardImages(
    vehicles.map(({ id }) => id),
  );
  return vehicles.map((vehicle) => ({
    vehicle,
    images: imagesByVehicleId.get(vehicle.id) ?? [],
  }));
}
