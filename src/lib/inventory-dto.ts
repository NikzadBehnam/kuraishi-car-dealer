import "server-only";

import type { Prisma, Vehicle } from "../generated/prisma/client.ts";
import type {
  PublicInventoryVehicleDTO,
  PublicVehicleMetadataDTO,
  StaffInventoryVehicleDTO,
} from "../types/inventory.ts";
import { getPublicVehicleVisibility } from "./inventory-policy.ts";

export const publicVehicleSelect = {
  id: true,
  slug: true,
  make: true,
  model: true,
  variant: true,
  description: true,
  price: true,
  firstRegistration: true,
  mileage: true,
  powerKw: true,
  ownerCount: true,
  fuelType: true,
  transmissionType: true,
  bodyType: true,
  exteriorColor: true,
  condition: true,
  consumption: true,
  consumptionUnit: true,
  co2Emission: true,
  features: true,
  labels: true,
  status: true,
  inspectionStatus: true,
  isFeatured: true,
  dealerId: true,
  location: true,
  publishedAt: true,
  updatedAt: true,
} satisfies Prisma.VehicleSelect;

export const staffVehicleSelect = {
  ...publicVehicleSelect,
  stockNumber: true,
  marginEstimate: true,
  vinLastSix: true,
  acquisitionDate: true,
  reservedUntil: true,
  soldAt: true,
  createdAt: true,
  createdById: true,
  updatedById: true,
  version: true,
} satisfies Prisma.VehicleSelect;

type PublicVehicleRow = Prisma.VehicleGetPayload<{
  select: typeof publicVehicleSelect;
}>;
type StaffVehicleRow = Prisma.VehicleGetPayload<{
  select: typeof staffVehicleSelect;
}>;

function serializeVehicle(row: PublicVehicleRow) {
  const powerKw = row.powerKw?.toNumber() ?? null;
  return {
    id: row.id,
    slug: row.slug,
    make: row.make,
    model: row.model,
    variant: row.variant,
    description: row.description,
    price: row.price?.toFixed(2) ?? null,
    firstRegistration: row.firstRegistration,
    mileage: row.mileage,
    powerKw,
    // One metric PS is exactly 0.73549875 kW.
    powerPs: powerKw === null ? null : Math.round(powerKw / 0.73549875),
    ownerCount: row.ownerCount,
    fuelType: row.fuelType,
    transmissionType: row.transmissionType,
    bodyType: row.bodyType,
    exteriorColor: row.exteriorColor,
    condition: row.condition,
    consumption: row.consumption?.toNumber() ?? null,
    consumptionUnit: row.consumptionUnit,
    co2Emission: row.co2Emission,
    features: [...row.features],
    labels: [...row.labels],
    status: row.status,
    isFeatured: row.isFeatured,
    dealerId: row.dealerId,
    location: row.location,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function serializePublicVehicle(
  row: PublicVehicleRow,
): PublicInventoryVehicleDTO {
  const visibility = getPublicVehicleVisibility(row);
  if (
    row.status === "draft" ||
    row.status === "archived" ||
    !visibility.detail
  ) {
    throw new Error("Cannot serialize an ineligible public inventory vehicle.");
  }
  return {
    ...serializeVehicle(row),
    status: row.status,
    isAvailable: row.status === "published",
    isFeatured: visibility.featured,
    hasPassedInspection: row.inspectionStatus === "passed",
  };
}

export function serializeStaffVehicle(
  row: StaffVehicleRow,
): StaffInventoryVehicleDTO {
  return {
    ...serializeVehicle(row),
    stockNumber: row.stockNumber,
    marginEstimate: row.marginEstimate?.toFixed(2) ?? null,
    vinLastSix: row.vinLastSix,
    inspectionStatus: row.inspectionStatus,
    acquisitionDate: row.acquisitionDate.toISOString().slice(0, 10),
    reservedUntil: row.reservedUntil?.toISOString() ?? null,
    soldAt: row.soldAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    createdById: row.createdById,
    updatedById: row.updatedById,
    version: row.version,
  };
}

export function serializeVehicleMetadata(
  row: Pick<Vehicle, keyof PublicVehicleMetadataDTO>,
): PublicVehicleMetadataDTO {
  if (row.status === "draft" || row.status === "archived") {
    throw new Error("Cannot serialize private vehicle metadata.");
  }
  return {
    id: row.id,
    slug: row.slug,
    make: row.make,
    model: row.model,
    variant: row.variant,
    price: row.price?.toFixed(2) ?? null,
    mileage: row.mileage,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  };
}
