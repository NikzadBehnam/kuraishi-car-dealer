import "server-only";

import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { Prisma } from "../generated/prisma/client.ts";
import { z } from "zod";

import { prisma } from "./db.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
  getPublicMediaBucket,
} from "./media-storage.ts";
import {
  inventoryIdSchema,
  inventorySlugSchema,
} from "./inventory-validation.ts";
import { requireSession } from "./session.ts";

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

function optionalDecimal(
  maxIntegerDigits: number,
  decimalPlaces: number,
  minimum: "positive" | "nonnegative" = "nonnegative",
) {
  const integerPart = `(?:0|[1-9]\\d{0,${maxIntegerDigits - 1}})`;
  const pattern = new RegExp(`^${integerPart}(?:\\.\\d{1,${decimalPlaces}})?$`);
  return z
    .string()
    .trim()
    .regex(pattern, "Enter a canonical decimal value.")
    .transform((value) => new Prisma.Decimal(value))
    .refine(
      (value) =>
        minimum === "positive" ? value.greaterThan(0) : !value.isNegative(),
      minimum === "positive"
        ? "Value must be greater than zero."
        : "Value cannot be negative.",
    )
    .nullable()
    .optional();
}

const nullableEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.enum(values).nullable().optional();

const enumValues = {
  condition: ["used", "demonstrator", "annual"],
  fuelType: ["petrol", "diesel", "electric", "hybrid"],
  transmissionType: ["automatic", "manual"],
  bodyType: ["suv", "compact", "sedan", "wagon", "van", "sports"],
  consumptionUnit: ["l_per_100_km", "kwh_per_100_km"],
} as const;

const optionalInteger = z
  .number()
  .finite()
  .int()
  .min(0)
  .max(2_147_483_647)
  .nullable()
  .optional();

const stringList = z
  .array(z.string().trim().min(1).max(100))
  .max(100)
  .optional();

const mediaAssetIdsSchema = z
  .array(inventoryIdSchema)
  .max(20, "A vehicle can have at most 20 images.")
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "An image cannot be attached more than once.",
  });

const vehicleDraftFieldsSchema = z.strictObject({
  stockNumber: requiredText("Stock number", 64).transform((value) =>
    value.toUpperCase(),
  ),
  slug: z.string().trim().pipe(inventorySlugSchema),
  make: requiredText("Make", 100),
  model: requiredText("Model", 100),
  variant: optionalText(255),
  description: optionalText(10_000),
  location: optionalText(255),
  exteriorColor: optionalText(100),
  condition: nullableEnum(enumValues.condition),
  price: optionalDecimal(10, 2, "positive"),
  marginEstimate: optionalDecimal(10, 2),
  firstRegistration: z
    .string()
    .regex(/^[0-9]{4}-(0[1-9]|1[0-2])$/)
    .nullable()
    .optional(),
  mileage: optionalInteger,
  powerKw: optionalDecimal(5, 2, "positive"),
  ownerCount: optionalInteger,
  vinLastSix: z
    .string()
    .regex(/^[A-Za-z0-9]{6}$/)
    .nullable()
    .optional(),
  fuelType: nullableEnum(enumValues.fuelType),
  transmissionType: nullableEnum(enumValues.transmissionType),
  bodyType: nullableEnum(enumValues.bodyType),
  consumption: optionalDecimal(4, 2),
  consumptionUnit: nullableEnum(enumValues.consumptionUnit),
  co2Emission: optionalInteger,
  features: stringList,
  labels: stringList,
});

export const createDraftVehicleSchema = vehicleDraftFieldsSchema.extend({
  mediaAssetIds: mediaAssetIdsSchema.default([]),
});

export const updateDraftVehicleSchema = vehicleDraftFieldsSchema
  .partial()
  .extend({
    vehicleId: inventoryIdSchema,
    expectedVersion: z.number().int().min(1).max(2_147_483_647),
    mediaAssetIds: mediaAssetIdsSchema.optional(),
  })
  .refine(
    (changes) =>
      Object.entries(changes).some(
        ([key, value]) =>
          key !== "vehicleId" &&
          key !== "expectedVersion" &&
          value !== undefined,
      ),
    { message: "Provide at least one draft change." },
  );

type MediaAssetRecord = {
  id: string;
  objectKey: string;
  bucketAccess: "private" | "public_read";
  type: string;
  verifiedMimeType: string;
  sizeBytes: bigint;
  publicApprovedAt: Date | null;
  publicApprovedById: string | null;
  vehicleAttachment: { vehicleId: string } | null;
};

export class InventoryMutationError extends Error {
  readonly status: 404 | 409 | 422 | 503;

  constructor(status: InventoryMutationError["status"], message: string) {
    super(message);
    this.name = "InventoryMutationError";
    this.status = status;
  }
}

function assertValidConsumption(state: {
  fuelType?: string | null;
  consumption?: Prisma.Decimal | null;
  consumptionUnit?: string | null;
}) {
  const hasConsumption =
    state.consumption !== null && state.consumption !== undefined;
  const hasUnit =
    state.consumptionUnit !== null && state.consumptionUnit !== undefined;
  if (hasConsumption !== hasUnit) {
    throw new InventoryMutationError(
      422,
      "Consumption and its unit must be provided or cleared together.",
    );
  }
  if (!hasConsumption) {
    return;
  }
  if (!state.fuelType) {
    throw new InventoryMutationError(
      422,
      "A fuel type is required when consumption is provided.",
    );
  }
  if (
    (["petrol", "diesel"].includes(state.fuelType) &&
      state.consumptionUnit !== "l_per_100_km") ||
    (state.fuelType === "electric" &&
      state.consumptionUnit !== "kwh_per_100_km")
  ) {
    throw new InventoryMutationError(
      422,
      "The consumption unit does not match the vehicle's fuel type.",
    );
  }
}

function validateMediaRows(
  assets: MediaAssetRecord[],
  ids: string[],
  vehicleId?: string,
): MediaAssetRecord[] {
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  if (byId.size !== ids.length) {
    throw new InventoryMutationError(
      422,
      "One or more selected images are missing, unfinished, or unavailable.",
    );
  }

  const ordered: MediaAssetRecord[] = [];
  for (const id of ids) {
    const asset = byId.get(id);
    if (
      !asset ||
      asset.type !== "image" ||
      !["image/jpeg", "image/png"].includes(asset.verifiedMimeType)
    ) {
      throw new InventoryMutationError(
        422,
        "Only completed image assets can be attached to a vehicle.",
      );
    }
    if (
      asset.vehicleAttachment &&
      asset.vehicleAttachment.vehicleId !== vehicleId
    ) {
      throw new InventoryMutationError(
        409,
        "An image is already attached to another vehicle.",
      );
    }
    if (
      asset.bucketAccess === "public_read" &&
      (!asset.publicApprovedAt || !asset.publicApprovedById)
    ) {
      throw new InventoryMutationError(
        422,
        "An image with public access must have a recorded approval.",
      );
    }
    ordered.push(asset);
  }
  return ordered;
}

async function loadMediaRows(ids: string[], vehicleId?: string) {
  if (!ids.length) {
    return [];
  }

  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      objectKey: true,
      bucketAccess: true,
      type: true,
      verifiedMimeType: true,
      sizeBytes: true,
      publicApprovedAt: true,
      publicApprovedById: true,
      vehicleAttachment: {
        select: { vehicleId: true },
      },
    },
  });
  const ordered = validateMediaRows(assets, ids, vehicleId);
  const client = getMediaStorageClient();

  for (const asset of ordered) {
    const bucket =
      asset.bucketAccess === "private"
        ? getPrivateMediaBucket()
        : getPublicMediaBucket();
    let head;
    try {
      head = await client.send(
        new HeadObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        (error.name === "NotFound" || error.name === "NoSuchKey")
      ) {
        throw new InventoryMutationError(
          422,
          "A selected image is missing from storage.",
        );
      }
      throw error;
    }
    if (
      head.ContentLength !== Number(asset.sizeBytes) ||
      head.ContentType !== asset.verifiedMimeType
    ) {
      throw new InventoryMutationError(
        422,
        "A selected image no longer matches its verified metadata.",
      );
    }
  }
  return ordered;
}

async function assertMediaAvailableInTransaction(
  tx: Prisma.TransactionClient,
  ids: string[],
  vehicleId?: string,
) {
  if (!ids.length) {
    return;
  }
  const assets = await tx.mediaAsset.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      objectKey: true,
      bucketAccess: true,
      type: true,
      verifiedMimeType: true,
      sizeBytes: true,
      publicApprovedAt: true,
      publicApprovedById: true,
      vehicleAttachment: {
        select: { vehicleId: true },
      },
    },
  });
  validateMediaRows(assets, ids, vehicleId);
}

async function getSingleDealershipId(tx: Prisma.TransactionClient) {
  const dealers = await tx.dealer.findMany({
    orderBy: { id: "asc" },
    select: { id: true },
    take: 2,
  });
  if (dealers.length !== 1) {
    throw new InventoryMutationError(
      503,
      "Vehicle saving requires exactly one dealership to be configured.",
    );
  }
  return dealers[0].id;
}

function todayInDealershipTimezone(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find(({ type }) => type === "year")?.value;
  const month = parts.find(({ type }) => type === "month")?.value;
  const day = parts.find(({ type }) => type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Could not determine today's dealership date.");
  }
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}

function prismaMutationError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new InventoryMutationError(
        409,
        "The stock number, slug, or image assignment conflicts with an existing record.",
      );
    }
    if (error.code === "P2034") {
      throw new InventoryMutationError(
        409,
        "The vehicle changed concurrently. Reload it and try again.",
      );
    }
    if (error.code === "P2003") {
      throw new InventoryMutationError(
        409,
        "A selected dealership or image is no longer available.",
      );
    }
  }
  throw error;
}

export async function createDraftVehicle(input: unknown) {
  const session = await requireSession();
  const parsed = createDraftVehicleSchema.parse(input);
  assertValidConsumption(parsed);
  const { mediaAssetIds, ...vehicleFields } = parsed;
  const media = await loadMediaRows(mediaAssetIds);

  try {
    return await prisma.$transaction(
      async (tx) => {
        await assertMediaAvailableInTransaction(tx, mediaAssetIds);
        const dealershipId = await getSingleDealershipId(tx);
        const vehicle = await tx.vehicle.create({
          data: {
            ...vehicleFields,
            dealerId: dealershipId,
            createdById: session.user.id,
            updatedById: session.user.id,
            acquisitionDate: todayInDealershipTimezone(),
            status: "draft",
            inspectionStatus: "pending",
            isFeatured: false,
          },
          select: { id: true, version: true },
        });
        await tx.vehicleChange.create({
          data: {
            vehicleId: vehicle.id,
            actorId: session.user.id,
            version: vehicle.version,
            previousStatus: null,
            status: "draft",
            previousInspectionStatus: null,
            inspectionStatus: "pending",
          },
        });
        if (media.length) {
          await tx.vehicleMedia.createMany({
            data: media.map((asset, position) => ({
              vehicleId: vehicle.id,
              mediaAssetId: asset.id,
              position,
            })),
          });
        }
        return {
          vehicleId: vehicle.id,
          version: vehicle.version,
          mediaAssetIds,
        };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    prismaMutationError(error);
  }
}

export async function updateDraftVehicle(input: unknown) {
  const session = await requireSession();
  const parsed = updateDraftVehicleSchema.parse(input);
  const { vehicleId, expectedVersion, mediaAssetIds, ...changes } = parsed;
  const current = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      version: true,
      status: true,
      inspectionStatus: true,
      soldAt: true,
      fuelType: true,
      consumption: true,
      consumptionUnit: true,
    },
  });
  if (!current) {
    throw new InventoryMutationError(404, "Vehicle was not found.");
  }
  if (current.status !== "draft") {
    throw new InventoryMutationError(
      409,
      "Only draft vehicles can be edited by this operation.",
    );
  }
  if (current.version !== expectedVersion) {
    throw new InventoryMutationError(
      409,
      "The vehicle changed since it was loaded. Reload it and try again.",
    );
  }
  assertValidConsumption({
    fuelType:
      changes.fuelType === undefined ? current.fuelType : changes.fuelType,
    consumption:
      changes.consumption === undefined
        ? current.consumption
        : changes.consumption,
    consumptionUnit:
      changes.consumptionUnit === undefined
        ? current.consumptionUnit
        : changes.consumptionUnit,
  });
  const media = mediaAssetIds
    ? await loadMediaRows(mediaAssetIds, vehicleId)
    : undefined;

  try {
    return await prisma.$transaction(
      async (tx) => {
        if (mediaAssetIds) {
          await assertMediaAvailableInTransaction(tx, mediaAssetIds, vehicleId);
        }
        const update = await tx.vehicle.updateMany({
          where: {
            id: vehicleId,
            version: expectedVersion,
            status: "draft",
          },
          data: {
            ...changes,
            updatedById: session.user.id,
            version: { increment: 1 },
          },
        });
        if (update.count !== 1) {
          throw new InventoryMutationError(
            409,
            "The vehicle changed since it was loaded. Reload it and try again.",
          );
        }
        const version = expectedVersion + 1;
        await tx.vehicleChange.create({
          data: {
            vehicleId,
            actorId: session.user.id,
            version,
            previousStatus: current.status,
            status: current.status,
            previousInspectionStatus: current.inspectionStatus,
            inspectionStatus: current.inspectionStatus,
            previousSoldAt: current.soldAt,
            soldAt: current.soldAt,
          },
        });
        if (media) {
          await tx.vehicleMedia.deleteMany({ where: { vehicleId } });
          if (media.length) {
            await tx.vehicleMedia.createMany({
              data: media.map((asset, position) => ({
                vehicleId,
                mediaAssetId: asset.id,
                position,
              })),
            });
          }
        }
        return {
          vehicleId,
          version,
          mediaAssetIds:
            mediaAssetIds ??
            (
              await tx.vehicleMedia.findMany({
                where: { vehicleId },
                orderBy: { position: "asc" },
                select: { mediaAssetId: true },
              })
            ).map(({ mediaAssetId }) => mediaAssetId),
        };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (error instanceof InventoryMutationError) {
      throw error;
    }
    prismaMutationError(error);
  }
}
