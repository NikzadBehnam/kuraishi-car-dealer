import type {
  VehicleBodyType,
  VehicleCondition,
  VehicleConsumptionUnit,
  VehicleFuelType,
  VehicleInspectionStatus,
  VehicleStatus,
  VehicleTransmissionType,
} from "../generated/prisma/enums.ts";
import type { PublicDealershipDTO } from "./dealership-settings.ts";

interface InventoryVehicleDTO {
  id: string;
  slug: string;
  make: string;
  model: string;
  variant: string | null;
  description: string | null;
  // Exact EUR decimal strings with two fractional digits, never localized money.
  price: string | null;
  firstRegistration: string | null;
  mileage: number | null;
  powerKw: number | null;
  powerPs: number | null;
  ownerCount: number | null;
  fuelType: VehicleFuelType | null;
  transmissionType: VehicleTransmissionType | null;
  bodyType: VehicleBodyType | null;
  exteriorColor: string | null;
  condition: VehicleCondition | null;
  consumption: number | null;
  consumptionUnit: VehicleConsumptionUnit | null;
  co2Emission: number | null;
  features: string[];
  labels: string[];
  status: VehicleStatus;
  isFeatured: boolean;
  dealerId: string;
  location: string | null;
  // UTC ISO-8601 instants; registration above remains YYYY-MM.
  publishedAt: string | null;
  updatedAt: string;
}

export interface PublicInventoryVehicleDTO extends Omit<
  InventoryVehicleDTO,
  "status"
> {
  status: "published" | "reserved" | "sold";
  isAvailable: boolean;
  hasPassedInspection: boolean;
}

export interface PublicVehicleCardImageDTO {
  id: string;
  url: string;
  altText: string | null;
}

export interface PublicVehicleDetailDTO extends PublicInventoryVehicleDTO {
  dealer: PublicDealershipDTO;
}

export type PublicVehicleDetailResolution =
  | { kind: "missing" }
  | { kind: "ineligible" }
  | { kind: "visible"; vehicle: PublicVehicleDetailDTO };

export interface StaffInventoryVehicleDTO extends InventoryVehicleDTO {
  stockNumber: string;
  marginEstimate: string | null;
  vinLastSix: string | null;
  mediaAssetIds: string[];
  inspectionStatus: VehicleInspectionStatus;
  // A business calendar date (YYYY-MM-DD), not an instant.
  acquisitionDate: string;
  reservedUntil: string | null;
  soldAt: string | null;
  createdAt: string;
  createdById: string;
  updatedById: string;
  version: number;
}

export interface InventoryDashboardSummaryDTO {
  total: number;
  statusCounts: Record<VehicleStatus, number>;
}

export type PublicVehicleMetadataDTO = Pick<
  PublicInventoryVehicleDTO,
  | "id"
  | "slug"
  | "make"
  | "model"
  | "variant"
  | "price"
  | "mileage"
  | "status"
  | "updatedAt"
>;

export type PublicVehicleSitemapEntryDTO = Pick<
  PublicInventoryVehicleDTO,
  "id" | "slug" | "updatedAt"
>;

export interface PublicVehicleInquiryDTO extends Pick<
  PublicInventoryVehicleDTO,
  "id" | "slug" | "make" | "model" | "variant"
> {
  status: "published" | "reserved";
  inquiryType: "standard" | "informational";
}

export interface InventoryPageDTO<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
