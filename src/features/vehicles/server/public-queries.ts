import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  createPaginatedResult,
  type PaginatedResult,
} from "@/features/shared/pagination.ts";
import { prisma } from "@/lib/prisma";

import type {
  PublicVehicleCardDto,
  PublicVehicleDetailDto,
  PublicVehicleSearchFacetsDto,
  PublicVehicleSitemapEntryDto,
} from "../dto.ts";
import {
  toPublicVehicleCardDto,
  toPublicVehicleDetailDto,
  toPublicVehicleSearchFacetsDto,
} from "../mappers.ts";
import {
  buildPublicVehicleOrderBy,
  buildPublicVehicleVisibilityWhere,
  buildPublicVehicleWhere,
} from "../query-policy.ts";
import { publicVehicleListQuerySchema, vehicleSlugSchema } from "../schemas.ts";

const vehicleImageSelect = {
  id: true,
  url: true,
  altText: true,
  width: true,
  height: true,
  position: true,
} satisfies Prisma.MediaAssetSelect;

const publicVehicleCardSelect = {
  id: true,
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
  isFeatured: true,
  labels: true,
  images: {
    orderBy: { position: "asc" },
    take: 1,
    select: vehicleImageSelect,
  },
} satisfies Prisma.VehicleSelect;

const publicVehicleDetailSelect = {
  ...publicVehicleCardSelect,
  description: true,
  consumption: true,
  co2Emission: true,
  ownerCount: true,
  features: true,
  images: {
    orderBy: { position: "asc" },
    select: vehicleImageSelect,
  },
} satisfies Prisma.VehicleSelect;

export async function listPublicVehicles(
  input: unknown = {},
): Promise<PaginatedResult<PublicVehicleCardDto>> {
  const query = publicVehicleListQuerySchema.parse(input);
  const where = buildPublicVehicleWhere(query);
  const orderBy = buildPublicVehicleOrderBy(query.sort);
  const skip = (query.page - 1) * query.pageSize;

  const [vehicles, total] = await prisma.$transaction([
    prisma.vehicle.findMany({
      where,
      orderBy,
      skip,
      take: query.pageSize,
      select: publicVehicleCardSelect,
    }),
    prisma.vehicle.count({ where }),
  ]);

  return createPaginatedResult(
    vehicles.map(toPublicVehicleCardDto),
    query.page,
    query.pageSize,
    total,
  );
}

export async function getPublicVehicleBySlug(
  input: unknown,
): Promise<PublicVehicleDetailDto | null> {
  const slug = vehicleSlugSchema.parse(input);
  const where: Prisma.VehicleWhereInput = {
    ...buildPublicVehicleVisibilityWhere(),
    slug,
  };

  const vehicle = await prisma.vehicle.findFirst({
    where,
    select: publicVehicleDetailSelect,
  });

  return vehicle ? toPublicVehicleDetailDto(vehicle) : null;
}

export async function listFeaturedPublicVehicles(
  limit = 3,
): Promise<PublicVehicleCardDto[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) {
    throw new RangeError("Featured vehicle limit must be between 1 and 12.");
  }

  const vehicles = await prisma.vehicle.findMany({
    where: {
      ...buildPublicVehicleVisibilityWhere(),
      isFeatured: true,
    },
    orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
    take: limit,
    select: publicVehicleCardSelect,
  });

  return vehicles.map(toPublicVehicleCardDto);
}

export async function getPublicVehicleSearchFacets(): Promise<PublicVehicleSearchFacetsDto> {
  const rows = await prisma.vehicle.groupBy({
    by: ["make", "model"],
    where: buildPublicVehicleVisibilityWhere(),
    _count: { _all: true },
    orderBy: [{ make: "asc" }, { model: "asc" }],
  });

  return toPublicVehicleSearchFacetsDto(rows);
}

export async function listSimilarPublicVehicles(
  vehicle: Pick<PublicVehicleDetailDto, "id" | "bodyType">,
  limit = 3,
): Promise<PublicVehicleCardDto[]> {
  if (!Number.isInteger(limit) || limit < 1 || limit > 12) {
    throw new RangeError("Similar vehicle limit must be between 1 and 12.");
  }

  const vehicles = await prisma.vehicle.findMany({
    where: {
      ...buildPublicVehicleVisibilityWhere(),
      bodyType: vehicle.bodyType,
      id: { not: vehicle.id },
    },
    orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }, { id: "asc" }],
    take: limit,
    select: publicVehicleCardSelect,
  });

  return vehicles.map(toPublicVehicleCardDto);
}

export async function listPublicVehicleSitemapEntries(): Promise<
  PublicVehicleSitemapEntryDto[]
> {
  const vehicles = await prisma.vehicle.findMany({
    where: buildPublicVehicleVisibilityWhere(),
    orderBy: { slug: "asc" },
    select: {
      slug: true,
      updatedAt: true,
    },
  });

  return vehicles.map((vehicle) => ({
    slug: vehicle.slug,
    updatedAt: vehicle.updatedAt.toISOString(),
  }));
}
