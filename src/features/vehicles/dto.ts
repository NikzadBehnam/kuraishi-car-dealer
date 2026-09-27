import type {
  PublicVehicleStatus,
  VehicleBodyType,
  VehicleCondition,
  VehicleFuelType,
  VehicleInspectionStatus,
  VehicleStatus,
  VehicleTransmissionType,
} from "./constants.ts";

export type VehicleImageDto = {
  id: string;
  url: string;
  altText: string;
  width: number | null;
  height: number | null;
  position: number;
};

export type PublicVehicleCardDto = {
  id: string;
  slug: string;
  make: string;
  model: string;
  variant: string;
  priceCents: number;
  firstRegistration: string;
  mileage: number;
  fuelType: VehicleFuelType;
  transmissionType: VehicleTransmissionType;
  powerKw: number;
  powerPs: number;
  bodyType: VehicleBodyType;
  exteriorColor: string;
  condition: VehicleCondition;
  status: PublicVehicleStatus;
  isFeatured: boolean;
  labels: string[];
  coverImage: VehicleImageDto | null;
};

export type PublicVehicleDetailDto = PublicVehicleCardDto & {
  description: string;
  consumption: number | null;
  co2Emission: number | null;
  ownerCount: number;
  features: string[];
  images: VehicleImageDto[];
};

export type PublicVehicleSitemapEntryDto = {
  slug: string;
  updatedAt: string;
};

export type PublicVehicleFacetOptionDto = {
  value: string;
  count: number;
};

export type PublicVehicleMakeFacetDto = PublicVehicleFacetOptionDto & {
  models: PublicVehicleFacetOptionDto[];
};

export type PublicVehicleSearchFacetsDto = {
  total: number;
  makes: PublicVehicleMakeFacetDto[];
};

export type AdminVehicleListItemDto = {
  id: string;
  stockNumber: string;
  slug: string;
  make: string;
  model: string;
  variant: string;
  priceCents: number;
  firstRegistration: string;
  mileage: number;
  fuelType: VehicleFuelType;
  transmissionType: VehicleTransmissionType;
  status: VehicleStatus;
  inspectionStatus: VehicleInspectionStatus;
  isFeatured: boolean;
  coverImage: VehicleImageDto | null;
  leadCount: number;
  favouriteCount: number;
  comparisonCount: number;
  updatedAt: string;
};

export type AdminVehicleMediaDto = VehicleImageDto & {
  provider: string;
  providerAssetId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type AdminVehicleDetailDto = AdminVehicleListItemDto & {
  description: string;
  marginEstimateCents: number | null;
  powerKw: number;
  powerPs: number;
  bodyType: VehicleBodyType;
  exteriorColor: string;
  consumption: number | null;
  co2Emission: number | null;
  condition: VehicleCondition;
  features: string[];
  labels: string[];
  vinLastSix: string;
  ownerCount: number;
  acquisitionDate: string | null;
  publishedAt: string | null;
  reservedAt: string | null;
  reservedUntil: string | null;
  soldAt: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  images: AdminVehicleMediaDto[];
};
