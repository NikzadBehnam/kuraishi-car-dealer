import "server-only";

import { z } from "zod";

import {
  Prisma,
  VehicleBodyType,
  VehicleFuelType,
  VehicleTransmissionType,
} from "../generated/prisma/client.ts";
import { prisma } from "./db.ts";
import {
  formatBodyType,
  formatFuelType,
  formatTransmission,
} from "./formatters.ts";
import {
  inventoryIdSchema,
  inventoryPaginationInputSchema,
  inventoryPaginationSchema,
  inventorySlugSchema,
  vehicleStatusSchema,
} from "./inventory-validation.ts";
import { requireSession } from "./session.ts";
import { getVehicleSearchTerms } from "./vehicle-filters.ts";

const publicVehicleSelect = {
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

const staffVehicleSelect = {
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

const catalogEligibility = {
  status: { in: ["published", "reserved"] },
  inspectionStatus: "passed",
} satisfies Prisma.VehicleWhereInput;

const activeEligibility = {
  status: "published",
  inspectionStatus: "passed",
} satisfies Prisma.VehicleWhereInput;

const detailEligibility = {
  OR: [catalogEligibility, { status: "sold" }],
} satisfies Prisma.VehicleWhereInput;

const staffOrder = [
  { updatedAt: "desc" },
  { id: "asc" },
] satisfies Prisma.VehicleOrderByWithRelationInput[];

const publicOrder = [
  { isFeatured: "desc" },
  ...staffOrder,
] satisfies Prisma.VehicleOrderByWithRelationInput[];

const staffListSchema = inventoryPaginationInputSchema.extend({
  status: vehicleStatusSchema.optional(),
});
const publicListSchema = inventoryPaginationInputSchema.extend({
  search: z.string().default(""),
});

const limitSchema = inventoryPaginationInputSchema.shape.pageSize.unwrap();
const featuredInputSchema = z.strictObject({ limit: limitSchema.default(8) });
const relatedInputSchema = z.strictObject({
  id: inventoryIdSchema,
  limit: limitSchema.default(3),
});

type PublicVehicleRow = Prisma.VehicleGetPayload<{
  select: typeof publicVehicleSelect;
}>;

function projectPublicVehicle(row: PublicVehicleRow) {
  const { inspectionStatus, ...vehicle } = row;
  const hasPassedInspection = inspectionStatus === "passed";
  const isAvailable = vehicle.status === "published" && hasPassedInspection;
  return {
    ...vehicle,
    isAvailable,
    isFeatured: isAvailable && vehicle.isFeatured,
    hasPassedInspection,
  };
}

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
    "status"::text IN (${Prisma.join(catalogEligibility.status.in)})
    AND "inspectionStatus"::text = ${catalogEligibility.inspectionStatus}
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
                catalogEligibility,
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

export async function listStaffVehicles(input: unknown = {}) {
  await requireSession();
  const { status, ...pageInput } = staffListSchema.parse(input);
  const { page, pageSize, skip, take } =
    inventoryPaginationSchema.parse(pageInput);
  const where: Prisma.VehicleWhereInput = status ? { status } : {};
  const [items, total] = await prisma.$transaction(
    [
      prisma.vehicle.findMany({
        where,
        select: staffVehicleSelect,
        orderBy: staffOrder,
        skip,
        take,
      }),
      prisma.vehicle.count({ where }),
    ],
    { isolationLevel: "RepeatableRead" },
  );
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getStaffVehicle(id: unknown) {
  await requireSession();
  return prisma.vehicle.findUnique({
    where: { id: inventoryIdSchema.parse(id) },
    select: staffVehicleSelect,
  });
}

export async function listPublicVehicles(input: unknown = {}) {
  const { search, ...pageInput } = publicListSchema.parse(input);
  const { page, pageSize, skip, take } =
    inventoryPaginationSchema.parse(pageInput);
  const terms = getVehicleSearchTerms(search);
  const [rows, total] = terms.length
    ? await searchPublicVehicles(terms, skip, take)
    : await prisma.$transaction(
        [
          prisma.vehicle.findMany({
            where: catalogEligibility,
            select: publicVehicleSelect,
            orderBy: publicOrder,
            skip,
            take,
          }),
          prisma.vehicle.count({ where: catalogEligibility }),
        ],
        { isolationLevel: "RepeatableRead" },
      );
  return {
    items: rows.map(projectPublicVehicle),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getPublicVehicle(slug: unknown) {
  const row = await prisma.vehicle.findFirst({
    where: {
      AND: [detailEligibility, { slug: inventorySlugSchema.parse(slug) }],
    },
    select: publicVehicleSelect,
  });
  return row ? projectPublicVehicle(row) : null;
}

export async function getFeaturedVehicles(input: unknown = {}) {
  const { limit } = featuredInputSchema.parse(input);
  const rows = await prisma.vehicle.findMany({
    where: { ...activeEligibility, isFeatured: true },
    select: publicVehicleSelect,
    orderBy: publicOrder,
    take: limit,
  });
  return rows.map(projectPublicVehicle);
}

export async function getRelatedVehicles(input: unknown) {
  const { id, limit } = relatedInputSchema.parse(input);
  return prisma.$transaction(
    async (tx) => {
      const source = await tx.vehicle.findFirst({
        where: { AND: [detailEligibility, { id }] },
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
          ...activeEligibility,
          id: { not: id },
          bodyType: source.bodyType,
        },
        select: publicVehicleSelect,
        orderBy: publicOrder,
        take: limit,
      });
      return rows.map(projectPublicVehicle);
    },
    { isolationLevel: "RepeatableRead" },
  );
}
