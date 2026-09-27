export const vehicleFuelTypes = [
  "petrol",
  "diesel",
  "electric",
  "hybrid",
] as const;

export const vehicleTransmissionTypes = ["automatic", "manual"] as const;

export const vehicleBodyTypes = [
  "suv",
  "compact",
  "sedan",
  "wagon",
  "van",
  "sports",
] as const;

export const vehicleConditions = ["used", "demonstrator", "annual"] as const;

export const vehicleStatuses = [
  "draft",
  "available",
  "reserved",
  "sold",
  "archived",
] as const;

export const publicVehicleStatuses = ["available", "reserved"] as const;

export const vehicleInspectionStatuses = [
  "pending",
  "in_progress",
  "passed",
  "failed",
] as const;

export const publicVehicleSorts = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "mileage-asc",
  "mileage-desc",
] as const;

export const adminVehicleSortFields = [
  "updatedAt",
  "stockNumber",
  "make",
  "model",
  "priceCents",
  "mileage",
  "status",
] as const;

export type VehicleFuelType = (typeof vehicleFuelTypes)[number];
export type VehicleTransmissionType =
  (typeof vehicleTransmissionTypes)[number];
export type VehicleBodyType = (typeof vehicleBodyTypes)[number];
export type VehicleCondition = (typeof vehicleConditions)[number];
export type VehicleStatus = (typeof vehicleStatuses)[number];
export type PublicVehicleStatus = (typeof publicVehicleStatuses)[number];
export type VehicleInspectionStatus =
  (typeof vehicleInspectionStatuses)[number];
export type PublicVehicleSort = (typeof publicVehicleSorts)[number];
export type AdminVehicleSortField = (typeof adminVehicleSortFields)[number];
