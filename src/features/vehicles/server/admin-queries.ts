import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  createPaginatedResult,
  type PaginatedResult,
} from "@/features/shared/pagination.ts";
import { resourceIdSchema } from "@/features/shared/schemas.ts";
import { authCapabilities, requireCapability } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

import type { AdminVehicleDetailDto, AdminVehicleListItemDto } from "../dto.ts";
import {
  toAdminVehicleDetailDto,
  toAdminVehicleListItemDto,
} from "../mappers.ts";
import {
  buildAdminVehicleOrderBy,
  buildAdminVehicleWhere,
} from "../query-policy.ts";
import {
  adminVehicleListQuerySchema,
  vehicleSlugSchema,
  vehicleStockNumberSchema,
} from "../schemas.ts";

const vehicleImageSelect = {
  id: true,
  url: true,
  altText: true,
  width: true,
  height: true,
  position: true,
} satisfies Prisma.MediaAssetSelect;

const vehicleCountSelect = {
  select: {
    leads: true,
    favourites: true,
    comparisonSelections: true,
  },
} satisfies Prisma.VehicleCountOutputTypeDefaultArgs;

const adminVehicleListSelect = {
  id: true,
  stockNumber: true,
  slug: true,
  make: true,
  model: true,
  variant: true,
  priceCents: true,
  firstRegistration: true,
  mileage: true,
  fuelType: true,
  transmissionType: true,
  powerKw: true,
  bodyType: true,
  exteriorColor: true,
  condition: true,
  status: true,
  inspectionStatus: true,
  isFeatured: true,
  labels: true,
  updatedAt: true,
  images: {
    orderBy: { position: "asc" },
    take: 1,
    select: vehicleImageSelect,
  },
  _count: vehicleCountSelect,
} satisfies Prisma.VehicleSelect;

const adminVehicleDetailSelect = {
  ...adminVehicleListSelect,
  description: true,
  marginEstimateCents: true,
  powerKw: true,
  bodyType: true,
  exteriorColor: true,
  consumption: true,
  co2Emission: true,
  condition: true,
  features: true,
  labels: true,
  vinLastSix: true,
  ownerCount: true,
  acquisitionDate: true,
  publishedAt: true,
  reservedAt: true,
  reservedUntil: true,
  soldAt: true,
  archivedAt: true,
  createdAt: true,
  updatedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  images: {
    orderBy: { position: "asc" },
    select: {
      ...vehicleImageSelect,
      provider: true,
      providerAssetId: true,
      originalFilename: true,
      mimeType: true,
      sizeBytes: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  },
} satisfies Prisma.VehicleSelect;

export async function listAdminVehicles(
  input: unknown = {},
): Promise<PaginatedResult<AdminVehicleListItemDto>> {
  await requireCapability(authCapabilities.manageVehicles);

  const query = adminVehicleListQuerySchema.parse(input);
  const where = buildAdminVehicleWhere(query);
  const orderBy = buildAdminVehicleOrderBy(query);
  const skip = (query.page - 1) * query.pageSize;

  const [vehicles, total] = await prisma.$transaction([
    prisma.vehicle.findMany({
      where,
      orderBy,
      skip,
      take: query.pageSize,
      select: adminVehicleListSelect,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return createPaginatedResult(
    vehicles.map(toAdminVehicleListItemDto),
    query.page,
    query.pageSize,
    total,
  );
}

export async function getAdminVehicleById(
  input: unknown,
): Promise<AdminVehicleDetailDto | null> {
  await requireCapability(authCapabilities.manageVehicles);

  const id = resourceIdSchema.parse(input);
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    select: adminVehicleDetailSelect,
  });

  return vehicle ? toAdminVehicleDetailDto(vehicle) : null;
}

export async function getAdminVehicleBySlug(
  input: unknown,
): Promise<AdminVehicleDetailDto | null> {
  await requireCapability(authCapabilities.manageVehicles);

  const slug = vehicleSlugSchema.parse(input);
  const vehicle = await prisma.vehicle.findUnique({
    where: { slug },
    select: adminVehicleDetailSelect,
  });

  return vehicle ? toAdminVehicleDetailDto(vehicle) : null;
}

export async function getAdminVehicleByStockNumber(
  input: unknown,
): Promise<AdminVehicleDetailDto | null> {
  await requireCapability(authCapabilities.manageVehicles);

  const stockNumber = vehicleStockNumberSchema.parse(input);
  const vehicle = await prisma.vehicle.findUnique({
    where: { stockNumber },
    select: adminVehicleDetailSelect,
  });

  return vehicle ? toAdminVehicleDetailDto(vehicle) : null;
}
