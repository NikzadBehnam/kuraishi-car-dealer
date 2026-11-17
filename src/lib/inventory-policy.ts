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

export type PublicInventorySurface = keyof PublicVehicleVisibility;

export type PublicInventoryRule = {
  readonly status: InventoryPolicyState["status"];
  readonly inspectionStatus?: InventoryPolicyState["inspectionStatus"];
  readonly isFeatured?: boolean;
};

const availableRule = {
  status: "published",
  inspectionStatus: "passed",
} as const;
const catalogRules = [
  availableRule,
  { status: "reserved", inspectionStatus: "passed" },
] as const;
const detailRules = [...catalogRules, { status: "sold" }] as const;

export const publicInventoryRules = {
  catalog: catalogRules,
  detail: detailRules,
  comparison: catalogRules,
  sitemap: detailRules,
  featured: [{ ...availableRule, isFeatured: true }],
  similar: [availableRule],
  inquiry: catalogRules,
} as const satisfies Record<
  PublicInventorySurface,
  readonly PublicInventoryRule[]
>;

export type PublicInventoryVehicle = Vehicle & {
  status: "published" | "reserved" | "sold";
  ownerCount: number;
  hasPassedInspection: boolean;
};

export function getPublicVehicleVisibility(
  vehicle: InventoryPolicyState,
): PublicVehicleVisibility {
  const eligible = (surface: PublicInventorySurface) => {
    const rules: readonly PublicInventoryRule[] = publicInventoryRules[surface];
    return rules.some(
      (rule) =>
        vehicle.status === rule.status &&
        (rule.inspectionStatus === undefined ||
          vehicle.inspectionStatus === rule.inspectionStatus) &&
        (rule.isFeatured === undefined ||
          vehicle.isFeatured === rule.isFeatured),
    );
  };

  return {
    catalog: eligible("catalog"),
    detail: eligible("detail"),
    comparison: eligible("comparison"),
    sitemap: eligible("sitemap"),
    featured: eligible("featured"),
    similar: eligible("similar"),
    inquiry: eligible("inquiry")
      ? vehicle.status === "reserved"
        ? "informational"
        : "standard"
      : null,
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
