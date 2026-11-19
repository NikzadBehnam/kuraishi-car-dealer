import "server-only";

import { z } from "zod";

import {
  Prisma,
  VehicleBodyType,
  VehicleFuelType,
  VehicleTransmissionType,
} from "../generated/prisma/client.ts";
import type {
  InventoryPageDTO,
  InventoryDashboardSummaryDTO,
  PublicInventoryVehicleDTO,
  PublicVehicleDetailResolution,
  PublicVehicleInquiryDTO,
  PublicVehicleMetadataDTO,
  PublicVehicleSitemapEntryDTO,
  StaffInventoryVehicleDTO,
} from "../types/inventory.ts";
import { prisma } from "./db.ts";
import {
  formatBodyType,
  formatFuelType,
  formatTransmission,
} from "./formatters.ts";
import {
  publicVehicleSelect,
  serializePublicVehicle,
  serializeStaffVehicle,
  serializeVehicleMetadata,
  staffVehicleSelect,
} from "./inventory-dto.ts";
import {
  getPublicVehicleEligibilitySql,
  getPublicVehicleWhere,
} from "./inventory-eligibility.ts";
import { getPublicVehicleVisibility } from "./inventory-policy.ts";
import {
  inventoryIdSchema,
  inventoryPaginationInputSchema,
  inventoryPaginationSchema,
  inventorySlugSchema,
  publicInventorySearchSchema,
  staffInventoryFiltersSchema,
} from "./inventory-validation.ts";
import type { StaffInventoryFilters } from "./inventory-validation.ts";
import { requireSession } from "./session.ts";
import { getVehicleSearchTerms } from "./vehicle-filters.ts";

const staffOrder = [
  { updatedAt: "desc" },
  { id: "asc" },
] satisfies Prisma.VehicleOrderByWithRelationInput[];

const publicOrder = [
  { isFeatured: "desc" },
  ...staffOrder,
] satisfies Prisma.VehicleOrderByWithRelationInput[];

const staffListSchema = inventoryPaginationInputSchema.extend({
  ...staffInventoryFiltersSchema.shape,
});
const publicListSchema = inventoryPaginationInputSchema.extend({
  search: publicInventorySearchSchema,
});

const limitSchema = inventoryPaginationInputSchema.shape.pageSize.unwrap();
const featuredInputSchema = z.strictObject({ limit: limitSchema.default(8) });
const relatedInputSchema = z.strictObject({
  id: inventoryIdSchema,
  limit: limitSchema.default(3),
});

function searchLabel(
  column: Prisma.Sql,
  values: string[],
  format: (value: string) => string,
) {
  return Prisma.sql`CASE ${column}::text
    ${Prisma.join(
      values.map((value) => Prisma.sql`WHEN ${value} THEN ${format(value)}`),
      " ",
    )}
    ELSE '' END`;
}

function getStaffVehicleWhere(
  filters: Pick<StaffInventoryFilters, "search" | "status">,
): Prisma.VehicleWhereInput {
  const conditions: Prisma.VehicleWhereInput[] = [];

  if (filters.status) {
    conditions.push({ status: filters.status });
  }

  for (const term of filters.search.split(/\s+/).filter(Boolean)) {
    conditions.push({
      OR: [
        { stockNumber: { contains: term, mode: "insensitive" } },
        { make: { contains: term, mode: "insensitive" } },
        { model: { contains: term, mode: "insensitive" } },
        { variant: { contains: term, mode: "insensitive" } },
        { location: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  return conditions.length ? { AND: conditions } : {};
}

function getStaffVehicleOrderBy(
  sort: StaffInventoryFilters["sort"],
  direction: StaffInventoryFilters["direction"],
): Prisma.VehicleOrderByWithRelationInput[] {
  switch (sort) {
    case "title":
      return [{ make: direction }, { model: direction }, { id: "asc" }];
    case "price":
      return [{ price: { sort: direction, nulls: "last" } }, { id: "asc" }];
    case "mileage":
      return [{ mileage: { sort: direction, nulls: "last" } }, { id: "asc" }];
    case "status":
      return [{ status: direction }, { id: "asc" }];
    case "location":
      return [{ location: { sort: direction, nulls: "last" } }, { id: "asc" }];
    case "lastUpdatedAt":
      return [{ updatedAt: direction }, { id: "asc" }];
  }
}

// Match filterVehicles' German lowercase/NFD/combining-mark rules, not stemming or transliteration.
const publicSearchText = Prisma.sql`regexp_replace(
  normalize(lower(concat_ws(' ',
    "make", "model", "variant",
    "bodyType"::text,
    ${searchLabel(Prisma.sql`"bodyType"`, Object.values(VehicleBodyType), formatBodyType)},
    "fuelType"::text,
    ${searchLabel(Prisma.sql`"fuelType"`, Object.values(VehicleFuelType), formatFuelType)},
    "transmissionType"::text,
    ${searchLabel(Prisma.sql`"transmissionType"`, Object.values(VehicleTransmissionType), formatTransmission)},
    "exteriorColor", "location", "firstRegistration",
    array_to_string("features", ' '), array_to_string("labels", ' ')
  ) COLLATE "de-x-icu"), NFD),
  ${"[\u0300-\u036f]"}, '', 'g'
)`;

async function searchPublicVehicles(
  terms: string[],
  skip: number,
  take: number,
) {
  const where = Prisma.sql`
    ${getPublicVehicleEligibilitySql("catalog")}
    AND NOT EXISTS (
      SELECT 1 FROM unnest(${terms}::text[]) AS term(value)
      WHERE strpos(${publicSearchText}, term.value) = 0
    )
  `;
  return prisma.$transaction(
    async (tx) => {
      const matches = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id" FROM "Vehicle" WHERE ${where}
        ORDER BY "isFeatured" DESC, "updatedAt" DESC, "id" ASC
        LIMIT ${take} OFFSET ${skip}
      `);
      const [{ total }] = await tx.$queryRaw<{ total: number }[]>(
        Prisma.sql`SELECT count(*)::int AS total FROM "Vehicle" WHERE ${where}`,
      );
      const rows = matches.length
        ? await tx.vehicle.findMany({
            where: {
              AND: [
                getPublicVehicleWhere("catalog"),
                { id: { in: matches.map(({ id }) => id) } },
              ],
            },
            select: publicVehicleSelect,
            orderBy: publicOrder,
            take,
          })
        : [];
      return [rows, total] as const;
    },
    { isolationLevel: "RepeatableRead" },
  );
}

export async function listStaffVehicles(
  input: unknown = {},
): Promise<InventoryPageDTO<StaffInventoryVehicleDTO>> {
  await requireSession();
  const { search, status, sort, direction, ...pageInput } =
    staffListSchema.parse(input);
  const { page, pageSize, skip, take } =
    inventoryPaginationSchema.parse(pageInput);
  const where = getStaffVehicleWhere({ search, status });
  const result = await prisma.$transaction(
    async (tx) => {
      const total = await tx.vehicle.count({ where });
      const totalPages = Math.ceil(total / pageSize);
      const items =
        page > Math.max(1, totalPages)
          ? []
          : await tx.vehicle.findMany({
              where,
              select: staffVehicleSelect,
              orderBy: getStaffVehicleOrderBy(sort, direction),
              skip,
              take,
            });
      return { items, total, page, pageSize, totalPages };
    },
    { isolationLevel: "RepeatableRead" },
  );
  return {
    ...result,
    items: result.items.map(serializeStaffVehicle),
  };
}

export async function getInventoryDashboardSummary(): Promise<InventoryDashboardSummaryDTO> {
  await requireSession();
  const grouped = await prisma.vehicle.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const statusCounts: InventoryDashboardSummaryDTO["statusCounts"] = {
    draft: 0,
    published: 0,
    reserved: 0,
    sold: 0,
    archived: 0,
  };
  for (const { status, _count } of grouped) {
    statusCounts[status] = _count._all;
  }
  return {
    total: Object.values(statusCounts).reduce((sum, count) => sum + count, 0),
    statusCounts,
  };
}

export async function getStaffVehicle(
  id: unknown,
): Promise<StaffInventoryVehicleDTO | null> {
  await requireSession();
  const row = await prisma.vehicle.findUnique({
    where: { id: inventoryIdSchema.parse(id) },
    select: staffVehicleSelect,
  });
  return row ? serializeStaffVehicle(row) : null;
}

export async function listPublicVehicles(
  input: unknown = {},
): Promise<InventoryPageDTO<PublicInventoryVehicleDTO>> {
  const { search, ...pageInput } = publicListSchema.parse(input);
  const { page, pageSize, skip, take } =
    inventoryPaginationSchema.parse(pageInput);
  const terms = getVehicleSearchTerms(search);
  const where = getPublicVehicleWhere("catalog");
  const [rows, total] = terms.length
    ? await searchPublicVehicles(terms, skip, take)
    : await prisma.$transaction(
        [
          prisma.vehicle.findMany({
            where,
            select: publicVehicleSelect,
            orderBy: publicOrder,
            skip,
            take,
          }),
          prisma.vehicle.count({ where }),
        ],
        { isolationLevel: "RepeatableRead" },
      );
  return {
    items: rows.map(serializePublicVehicle),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getPublicVehicle(
  slug: unknown,
): Promise<PublicInventoryVehicleDTO | null> {
  const row = await prisma.vehicle.findFirst({
    where: {
      AND: [
        getPublicVehicleWhere("detail"),
        { slug: inventorySlugSchema.parse(slug) },
      ],
    },
    select: publicVehicleSelect,
  });
  return row ? serializePublicVehicle(row) : null;
}

export async function resolvePublicVehicleDetail(
  slug: unknown,
): Promise<PublicVehicleDetailResolution> {
  const parsedSlug = inventorySlugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return { kind: "missing" };
  }

  const row = await prisma.vehicle.findUnique({
    where: { slug: parsedSlug.data },
    select: {
      ...publicVehicleSelect,
      dealer: { select: { name: true } },
    },
  });
  if (!row) {
    return { kind: "missing" };
  }

  const { dealer, ...vehicleRow } = row;
  if (!getPublicVehicleVisibility(vehicleRow).detail) {
    return { kind: "ineligible" };
  }

  return {
    kind: "visible",
    vehicle: {
      ...serializePublicVehicle(vehicleRow),
      dealerName: dealer.name,
    },
  };
}

export async function getPublicComparisonVehicle(
  id: unknown,
): Promise<PublicInventoryVehicleDTO | null> {
  const row = await prisma.vehicle.findFirst({
    where: {
      AND: [
        getPublicVehicleWhere("comparison"),
        { id: inventoryIdSchema.parse(id) },
      ],
    },
    select: publicVehicleSelect,
  });
  return row ? serializePublicVehicle(row) : null;
}

export async function getPublicVehicleMetadata(
  slug: unknown,
): Promise<PublicVehicleMetadataDTO | null> {
  const row = await prisma.vehicle.findFirst({
    where: {
      AND: [
        getPublicVehicleWhere("detail"),
        { slug: inventorySlugSchema.parse(slug) },
      ],
    },
    select: {
      id: true,
      slug: true,
      make: true,
      model: true,
      variant: true,
      price: true,
      mileage: true,
      status: true,
      updatedAt: true,
    },
  });
  return row ? serializeVehicleMetadata(row) : null;
}

export async function listPublicVehicleSitemapEntries(
  input: unknown = {},
): Promise<InventoryPageDTO<PublicVehicleSitemapEntryDTO>> {
  const { page, pageSize, skip, take } = inventoryPaginationSchema.parse(input);
  const where = getPublicVehicleWhere("sitemap");
  const [items, total] = await prisma.$transaction(
    [
      prisma.vehicle.findMany({
        where,
        select: { id: true, slug: true, updatedAt: true },
        orderBy: { id: "asc" },
        skip,
        take,
      }),
      prisma.vehicle.count({ where }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return {
    items: items.map((row) => ({
      id: row.id,
      slug: row.slug,
      updatedAt: row.updatedAt.toISOString(),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getPublicVehicleForInquiry(
  slug: unknown,
): Promise<PublicVehicleInquiryDTO | null> {
  const row = await prisma.vehicle.findFirst({
    where: {
      AND: [
        getPublicVehicleWhere("inquiry"),
        { slug: inventorySlugSchema.parse(slug) },
      ],
    },
    select: {
      id: true,
      slug: true,
      make: true,
      model: true,
      variant: true,
      status: true,
      inspectionStatus: true,
      isFeatured: true,
    },
  });
  if (!row) {
    return null;
  }
  const { status, inspectionStatus, isFeatured, ...vehicle } = row;
  if (status !== "published" && status !== "reserved") {
    return null;
  }
  const inquiryType = getPublicVehicleVisibility({
    status,
    inspectionStatus,
    isFeatured,
  }).inquiry;
  return inquiryType ? { ...vehicle, status, inquiryType } : null;
}

export async function getFeaturedVehicles(
  input: unknown = {},
): Promise<PublicInventoryVehicleDTO[]> {
  const { limit } = featuredInputSchema.parse(input);
  const rows = await prisma.vehicle.findMany({
    where: getPublicVehicleWhere("featured"),
    select: publicVehicleSelect,
    orderBy: publicOrder,
    take: limit,
  });
  return rows.map(serializePublicVehicle);
}

export async function getRelatedVehicles(
  input: unknown,
): Promise<PublicInventoryVehicleDTO[] | null> {
  const { id, limit } = relatedInputSchema.parse(input);
  return prisma.$transaction(
    async (tx) => {
      const source = await tx.vehicle.findFirst({
        where: { AND: [getPublicVehicleWhere("detail"), { id }] },
        select: { bodyType: true },
      });
      if (!source) {
        return null;
      }
      if (source.bodyType === null) {
        return [];
      }
      const rows = await tx.vehicle.findMany({
        where: {
          ...getPublicVehicleWhere("similar"),
          id: { not: id },
          bodyType: source.bodyType,
        },
        select: publicVehicleSelect,
        orderBy: publicOrder,
        take: limit,
      });
      return rows.map(serializePublicVehicle);
    },
    { isolationLevel: "RepeatableRead" },
  );
}
