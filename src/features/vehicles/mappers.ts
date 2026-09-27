import {
  publicVehicleStatuses,
  type PublicVehicleStatus,
  type VehicleBodyType,
  type VehicleCondition,
  type VehicleFuelType,
  type VehicleInspectionStatus,
  type VehicleStatus,
  type VehicleTransmissionType,
} from "./constants.ts";
import type {
  AdminVehicleDetailDto,
  AdminVehicleListItemDto,
  AdminVehicleMediaDto,
  PublicVehicleCardDto,
  PublicVehicleDetailDto,
  PublicVehicleSearchFacetsDto,
  VehicleImageDto,
} from "./dto.ts";

type VehicleImageRecord = {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
  position: number | null;
};

type VehicleCardRecord = {
  id: string;
  slug: string;
  make: string;
  model: string;
  variant: string;
  priceCents: number;
  firstRegistration: Date;
  mileage: number;
  fuelType: VehicleFuelType;
  transmissionType: VehicleTransmissionType;
  powerKw: number;
  bodyType: VehicleBodyType;
  exteriorColor: string;
  condition: VehicleCondition;
  status: VehicleStatus;
  isFeatured: boolean;
  labels: string[];
  images: VehicleImageRecord[];
};

type AdminVehicleListRecord = VehicleCardRecord & {
  stockNumber: string;
  inspectionStatus: VehicleInspectionStatus;
  updatedAt: Date;
  _count: {
    leads: number;
    favourites: number;
    comparisonSelections: number;
  };
};

type AdminVehicleMediaRecord = VehicleImageRecord & {
  provider: string;
  providerAssetId: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: bigint;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

type AdminVehicleDetailRecord = Omit<AdminVehicleListRecord, "images"> & {
  description: string;
  marginEstimateCents: number | null;
  consumption: number | null;
  co2Emission: number | null;
  features: string[];
  vinLastSix: string;
  ownerCount: number;
  acquisitionDate: Date | null;
  publishedAt: Date | null;
  reservedAt: Date | null;
  reservedUntil: Date | null;
  soldAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  images: AdminVehicleMediaRecord[];
};

type PublicVehicleMakeModelCountRecord = {
  make: string;
  model: string;
  _count: {
    _all: number;
  };
};

export function toPublicVehicleCardDto(
  vehicle: VehicleCardRecord,
): PublicVehicleCardDto {
  const status = getPublicVehicleStatus(vehicle.status);

  return {
    id: vehicle.id,
    slug: vehicle.slug,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    priceCents: vehicle.priceCents,
    firstRegistration: formatMonth(vehicle.firstRegistration),
    mileage: vehicle.mileage,
    fuelType: vehicle.fuelType,
    transmissionType: vehicle.transmissionType,
    powerKw: vehicle.powerKw,
    powerPs: toMetricHorsepower(vehicle.powerKw),
    bodyType: vehicle.bodyType,
    exteriorColor: vehicle.exteriorColor,
    condition: vehicle.condition,
    status,
    isFeatured: vehicle.isFeatured,
    labels: [...vehicle.labels],
    coverImage: getCoverImage(vehicle),
  };
}

export function toPublicVehicleDetailDto(
  vehicle: VehicleCardRecord & {
    description: string;
    consumption: number | null;
    co2Emission: number | null;
    ownerCount: number;
    features: string[];
  },
): PublicVehicleDetailDto {
  return {
    ...toPublicVehicleCardDto(vehicle),
    description: vehicle.description,
    consumption: vehicle.consumption,
    co2Emission: vehicle.co2Emission,
    ownerCount: vehicle.ownerCount,
    features: [...vehicle.features],
    images: orderImages(vehicle.images).map((image) =>
      toVehicleImageDto(image, getVehicleImageFallback(vehicle)),
    ),
  };
}

export function toAdminVehicleListItemDto(
  vehicle: AdminVehicleListRecord,
): AdminVehicleListItemDto {
  return {
    id: vehicle.id,
    stockNumber: vehicle.stockNumber,
    slug: vehicle.slug,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    priceCents: vehicle.priceCents,
    firstRegistration: formatMonth(vehicle.firstRegistration),
    mileage: vehicle.mileage,
    fuelType: vehicle.fuelType,
    transmissionType: vehicle.transmissionType,
    status: vehicle.status,
    inspectionStatus: vehicle.inspectionStatus,
    isFeatured: vehicle.isFeatured,
    coverImage: getCoverImage(vehicle),
    leadCount: vehicle._count.leads,
    favouriteCount: vehicle._count.favourites,
    comparisonCount: vehicle._count.comparisonSelections,
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

export function toAdminVehicleDetailDto(
  vehicle: AdminVehicleDetailRecord,
): AdminVehicleDetailDto {
  const listItem = toAdminVehicleListItemDto(vehicle);

  return {
    ...listItem,
    description: vehicle.description,
    marginEstimateCents: vehicle.marginEstimateCents,
    powerKw: vehicle.powerKw,
    powerPs: toMetricHorsepower(vehicle.powerKw),
    bodyType: vehicle.bodyType,
    exteriorColor: vehicle.exteriorColor,
    consumption: vehicle.consumption,
    co2Emission: vehicle.co2Emission,
    condition: vehicle.condition,
    features: [...vehicle.features],
    labels: [...vehicle.labels],
    vinLastSix: vehicle.vinLastSix,
    ownerCount: vehicle.ownerCount,
    acquisitionDate: formatNullableDate(vehicle.acquisitionDate),
    publishedAt: formatNullableDateTime(vehicle.publishedAt),
    reservedAt: formatNullableDateTime(vehicle.reservedAt),
    reservedUntil: formatNullableDateTime(vehicle.reservedUntil),
    soldAt: formatNullableDateTime(vehicle.soldAt),
    archivedAt: formatNullableDateTime(vehicle.archivedAt),
    createdAt: vehicle.createdAt.toISOString(),
    updatedBy: vehicle.updatedBy ? { ...vehicle.updatedBy } : null,
    images: orderImages(vehicle.images).map((image) =>
      toAdminVehicleMediaDto(image, getVehicleImageFallback(vehicle)),
    ),
  };
}

export function toPublicVehicleSearchFacetsDto(
  rows: PublicVehicleMakeModelCountRecord[],
): PublicVehicleSearchFacetsDto {
  const makes = new Map<
    string,
    { count: number; models: Map<string, number> }
  >();

  for (const row of rows) {
    const make = makes.get(row.make) ?? {
      count: 0,
      models: new Map<string, number>(),
    };

    make.count += row._count._all;
    make.models.set(
      row.model,
      (make.models.get(row.model) ?? 0) + row._count._all,
    );
    makes.set(row.make, make);
  }

  return {
    total: rows.reduce((total, row) => total + row._count._all, 0),
    makes: Array.from(makes, ([value, make]) => ({
      value,
      count: make.count,
      models: Array.from(make.models, ([model, count]) => ({
        value: model,
        count,
      })).toSorted((left, right) =>
        left.value.localeCompare(right.value, "de"),
      ),
    })).toSorted((left, right) => left.value.localeCompare(right.value, "de")),
  };
}

function getCoverImage(vehicle: VehicleCardRecord) {
  const image = orderImages(vehicle.images)[0];

  return image
    ? toVehicleImageDto(image, getVehicleImageFallback(vehicle))
    : null;
}

function toVehicleImageDto(
  image: VehicleImageRecord,
  fallbackAltText: string,
): VehicleImageDto {
  if (image.position === null) {
    throw new Error(`Vehicle image ${image.id} does not have a position.`);
  }

  return {
    id: image.id,
    url: image.url,
    altText: image.altText?.trim() || fallbackAltText,
    width: image.width,
    height: image.height,
    position: image.position,
  };
}

function toAdminVehicleMediaDto(
  image: AdminVehicleMediaRecord,
  fallbackAltText: string,
): AdminVehicleMediaDto {
  return {
    ...toVehicleImageDto(image, fallbackAltText),
    provider: image.provider,
    providerAssetId: image.providerAssetId,
    originalFilename: image.originalFilename,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes.toString(),
    title: image.title,
    createdAt: image.createdAt.toISOString(),
    updatedAt: image.updatedAt.toISOString(),
  };
}

function orderImages<TImage extends VehicleImageRecord>(images: TImage[]) {
  return [...images].sort(
    (left, right) => (left.position ?? Infinity) - (right.position ?? Infinity),
  );
}

function getVehicleImageFallback(vehicle: VehicleCardRecord) {
  return `${vehicle.make} ${vehicle.model} ${vehicle.variant}`;
}

function getPublicVehicleStatus(status: VehicleStatus): PublicVehicleStatus {
  if ((publicVehicleStatuses as readonly string[]).includes(status)) {
    return status as PublicVehicleStatus;
  }

  throw new Error(`Vehicle status ${status} is not public.`);
}

function formatMonth(value: Date) {
  return value.toISOString().slice(0, 7);
}

function formatNullableDate(value: Date | null) {
  return value?.toISOString().slice(0, 10) ?? null;
}

function formatNullableDateTime(value: Date | null) {
  return value?.toISOString() ?? null;
}

function toMetricHorsepower(powerKw: number) {
  return Math.round(powerKw * 1.35962);
}
