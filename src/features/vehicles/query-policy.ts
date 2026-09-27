import type { Prisma } from "../../generated/prisma/client.ts";

import { publicVehicleStatuses } from "./constants.ts";
import type {
  AdminVehicleListQuery,
  PublicVehicleListQuery,
} from "./schemas.ts";

const insensitive = "insensitive" as const;

export function buildPublicVehicleWhere(
  query: PublicVehicleListQuery,
): Prisma.VehicleWhereInput {
  return {
    ...buildPublicVehicleVisibilityWhere(),
    ...(query.bodyType ? { bodyType: query.bodyType } : {}),
    ...(query.condition ? { condition: query.condition } : {}),
    ...(query.featured !== undefined ? { isFeatured: query.featured } : {}),
    ...(query.fuelType ? { fuelType: query.fuelType } : {}),
    ...(query.make ? { make: { equals: query.make, mode: insensitive } } : {}),
    ...(query.model
      ? { model: { equals: query.model, mode: insensitive } }
      : {}),
    ...(query.maximumMileage !== undefined
      ? { mileage: { lte: query.maximumMileage } }
      : {}),
    ...(query.minimumPriceCents !== undefined ||
    query.maximumPriceCents !== undefined
      ? {
          priceCents: {
            ...(query.minimumPriceCents !== undefined
              ? { gte: query.minimumPriceCents }
              : {}),
            ...(query.maximumPriceCents !== undefined
              ? { lte: query.maximumPriceCents }
              : {}),
          },
        }
      : {}),
    ...(query.transmissionType
      ? { transmissionType: query.transmissionType }
      : {}),
    ...(query.search
      ? {
          OR: [
            { make: { contains: query.search, mode: insensitive } },
            { model: { contains: query.search, mode: insensitive } },
            { variant: { contains: query.search, mode: insensitive } },
          ],
        }
      : {}),
  };
}

export function buildPublicVehicleVisibilityWhere(): Prisma.VehicleWhereInput {
  return { status: { in: [...publicVehicleStatuses] } };
}

export function buildPublicVehicleOrderBy(
  sort: PublicVehicleListQuery["sort"],
): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ firstRegistration: "desc" }, { id: "asc" }];
    case "price-asc":
      return [{ priceCents: "asc" }, { id: "asc" }];
    case "price-desc":
      return [{ priceCents: "desc" }, { id: "asc" }];
    case "mileage-asc":
      return [{ mileage: "asc" }, { id: "asc" }];
    case "mileage-desc":
      return [{ mileage: "desc" }, { id: "asc" }];
    case "featured":
      return [{ isFeatured: "desc" }, { publishedAt: "desc" }, { id: "asc" }];
  }
}

export function buildAdminVehicleWhere(
  query: AdminVehicleListQuery,
): Prisma.VehicleWhereInput {
  return {
    ...(query.status ? { status: query.status } : {}),
    ...(query.inspectionStatus
      ? { inspectionStatus: query.inspectionStatus }
      : {}),
    ...(query.search
      ? {
          OR: [
            { stockNumber: { contains: query.search, mode: insensitive } },
            { make: { contains: query.search, mode: insensitive } },
            { model: { contains: query.search, mode: insensitive } },
            { variant: { contains: query.search, mode: insensitive } },
            { vinLastSix: { contains: query.search, mode: insensitive } },
          ],
        }
      : {}),
  };
}

export function buildAdminVehicleOrderBy(
  query: AdminVehicleListQuery,
): Prisma.VehicleOrderByWithRelationInput[] {
  const primaryOrder = {
    [query.sortField]: query.sortDirection,
  } as Prisma.VehicleOrderByWithRelationInput;

  return [primaryOrder, { id: "asc" }];
}
