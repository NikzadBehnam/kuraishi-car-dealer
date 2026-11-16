import type { AdminVehicle } from "../types/admin.ts";
import type { Vehicle } from "../types/vehicle.ts";

export type InventoryPolicyState = Pick<
  AdminVehicle,
  "status" | "inspectionStatus" | "isFeatured"
>;

export type PublicVehicleVisibility = {
  catalog: boolean;
  detail: boolean;
  comparison: boolean;
  sitemap: boolean;
  featured: boolean;
  similar: boolean;
  inquiry: "standard" | "informational" | null;
};

export type PublicInventoryVehicle = Vehicle & {
  status: "published" | "reserved" | "sold";
  ownerCount: number;
  hasPassedInspection: boolean;
};

export function getPublicVehicleVisibility(
  vehicle: InventoryPolicyState,
): PublicVehicleVisibility {
  const inspected = vehicle.inspectionStatus === "passed";
  const available = vehicle.status === "published" && inspected;
  const reserved = vehicle.status === "reserved" && inspected;
  const detail = available || reserved || vehicle.status === "sold";

  return {
    catalog: available || reserved,
    detail,
    comparison: available || reserved,
    sitemap: detail,
    featured: available && vehicle.isFeatured,
    similar: available,
    inquiry: available ? "standard" : reserved ? "informational" : null,
  };
}

export function toPublicInventoryVehicle(
  vehicle: AdminVehicle,
): PublicInventoryVehicle | null {
  const visibility = getPublicVehicleVisibility(vehicle);

  if (
    vehicle.status === "draft" ||
    vehicle.status === "archived" ||
    !visibility.detail
  ) {
    return null;
  }

  // Allowlist public fields so future staff/customer fields cannot leak.
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    price: vehicle.price,
    firstRegistration: vehicle.firstRegistration,
    mileage: vehicle.mileage,
    fuelType: vehicle.fuelType,
    transmissionType: vehicle.transmissionType,
    powerKw: vehicle.powerKw,
    powerPs: vehicle.powerPs,
    bodyType: vehicle.bodyType,
    exteriorColor: vehicle.exteriorColor,
    consumption: vehicle.consumption,
    co2Emission: vehicle.co2Emission,
    condition: vehicle.condition,
    features: [...vehicle.features],
    description: vehicle.description,
    images: [...vehicle.images],
    dealerId: vehicle.dealerId,
    location: vehicle.location,
    isFeatured: visibility.featured,
    isAvailable: vehicle.status === "published",
    labels: [...vehicle.labels],
    status: vehicle.status,
    ownerCount: vehicle.ownerCount,
    hasPassedInspection: vehicle.inspectionStatus === "passed",
  };
}
