import "server-only";

import { randomUUID } from "node:crypto";
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
  firstRegistrationMonthSchema,
  inventoryIdSchema,
  inventorySlugSchema,
} from "./inventory-validation.ts";
import {
  InventoryPolicyError,
  resolveInventoryPolicyUpdate,
} from "./inventory-lifecycle.ts";
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

const optionalDescription = optionalText(10_000).refine(
  (value) =>
    value === undefined ||
    value === null ||
    value.length === 0 ||
    value.length >= 20,
  "Description must be at least 20 characters when provided.",
);

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
  description: optionalDescription,
  location: optionalText(255),
  exteriorColor: optionalText(100),
  condition: nullableEnum(enumValues.condition),
  price: optionalDecimal(10, 2, "positive"),
  marginEstimate: optionalDecimal(10, 2),
  firstRegistration: z
    .string()
    .trim()
    .pipe(firstRegistrationMonthSchema)
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

export const updateVehicleSchema = vehicleDraftFieldsSchema
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
    { message: "Provide at least one vehicle change." },
  );

export const vehicleLifecycleMutationSchema = z.strictObject({
  vehicleId: inventoryIdSchema,
  expectedVersion: z.number().int().min(1).max(2_147_483_647),
  status: z.enum(["sold", "archived"]),
});

export const duplicateVehicleMutationSchema = z.strictObject({
  vehicleId: inventoryIdSchema,
  expectedVersion: z.number().int().min(1).max(2_147_483_647),
});

export const publishVehicleSchema = vehicleDraftFieldsSchema
  .extend({
    mediaAssetIds: mediaAssetIdsSchema,
    confirmInspectionPassed: z.literal(true),
    vehicleId: inventoryIdSchema.optional(),
    expectedVersion: z.number().int().min(1).max(2_147_483_647).optional(),
  })
  .superRefine((publication, context) => {
    if (
      (publication.vehicleId === undefined) !==
      (publication.expectedVersion === undefined)
    ) {
      context.addIssue({
        code: "custom",
        path: [
          publication.vehicleId === undefined ? "vehicleId" : "expectedVersion",
        ],
        message: "Vehicle ID and expected version must be provided together.",
      });
    }

    const requiredFields = [
      [
        "price",
        "Price",
        publication.price === null || publication.price === undefined,
      ],
      [
        "firstRegistration",
        "First registration",
        publication.firstRegistration === null ||
          publication.firstRegistration === undefined,
      ],
      [
        "mileage",
        "Mileage",
        publication.mileage === null || publication.mileage === undefined,
      ],
      [
        "powerKw",
        "Power",
        publication.powerKw === null || publication.powerKw === undefined,
      ],
      [
        "fuelType",
        "Fuel type",
        publication.fuelType === null || publication.fuelType === undefined,
      ],
      [
        "transmissionType",
        "Transmission",
        publication.transmissionType === null ||
          publication.transmissionType === undefined,
      ],
      [
        "bodyType",
        "Body type",
        publication.bodyType === null || publication.bodyType === undefined,
      ],
      [
        "condition",
        "Condition",
        publication.condition === null || publication.condition === undefined,
      ],
      [
        "location",
        "Location",
        publication.location === null || publication.location === undefined,
      ],
      [
        "description",
        "Description",
        typeof publication.description !== "string" ||
          publication.description.length < 20,
      ],
    ] as const;

    for (const [field, label, missing] of requiredFields) {
      if (missing) {
        context.addIssue({
          code: "custom",
          path: [field],
          message:
            field === "description"
              ? "Description must be at least 20 characters to publish."
              : `${label} is required before publishing.`,
        });
      }
    }
  });

type MediaAssetRecord = {
  id: string;
  objectKey: string;
  bucketAccess: "private" | "public_read";
  type: "image" | "document" | "brand";
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
    return [];
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
  return validateMediaRows(assets, ids, vehicleId);
}

type PublicMediaAsset = Pick<
  MediaAssetRecord,
  "type" | "bucketAccess" | "publicApprovedAt" | "publicApprovedById"
>;

function assertPublicVehicleHasApprovedImage(
  status: string,
  assets: readonly PublicMediaAsset[],
) {
  if (
    ["published", "reserved", "sold"].includes(status) &&
    !assets.some(
      (asset) =>
        asset.type === "image" &&
        asset.bucketAccess === "public_read" &&
        asset.publicApprovedAt !== null &&
        asset.publicApprovedById !== null,
    )
  ) {
    throw new InventoryMutationError(
      422,
      "Published, reserved, and sold vehicles must retain at least one approved public image.",
    );
  }
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

export async function duplicateVehicle(input: unknown) {
  const session = await requireSession();
  const { vehicleId, expectedVersion } =
    duplicateVehicleMutationSchema.parse(input);
  const token = randomUUID().replaceAll("-", "");
  const stockNumber = `COPY-${token}`;
  const slug = `copy-${token.toLowerCase()}`;

  try {
    return await prisma.$transaction(
      async (tx) => {
        const source = await tx.vehicle.findUnique({
          where: { id: vehicleId },
          select: {
            version: true,
            make: true,
            model: true,
            variant: true,
            description: true,
            location: true,
            exteriorColor: true,
            condition: true,
            price: true,
            marginEstimate: true,
            firstRegistration: true,
            mileage: true,
            powerKw: true,
            ownerCount: true,
            fuelType: true,
            transmissionType: true,
            bodyType: true,
            consumption: true,
            consumptionUnit: true,
            co2Emission: true,
            features: true,
            labels: true,
          },
        });
        if (!source) {
          throw new InventoryMutationError(404, "Vehicle was not found.");
        }
        if (source.version !== expectedVersion) {
          throw new InventoryMutationError(
            409,
            "The vehicle changed since it was loaded. Reload it before duplicating.",
          );
        }

        const draft = vehicleDraftFieldsSchema.parse({
          stockNumber,
          slug,
          make: source.make,
          model: source.model,
          variant: source.variant,
          description: source.description,
          location: source.location,
          exteriorColor: source.exteriorColor,
          condition: source.condition,
          price: source.price?.toFixed(2) ?? null,
          marginEstimate: source.marginEstimate?.toFixed(2) ?? null,
          firstRegistration: source.firstRegistration,
          mileage: source.mileage,
          powerKw: source.powerKw?.toFixed(2) ?? null,
          ownerCount: source.ownerCount,
          vinLastSix: null,
          fuelType: source.fuelType,
          transmissionType: source.transmissionType,
          bodyType: source.bodyType,
          consumption: source.consumption?.toFixed(2) ?? null,
          consumptionUnit: source.consumptionUnit,
          co2Emission: source.co2Emission,
          features: source.features,
          labels: source.labels,
        });
        assertValidConsumption(draft);

        const dealerId = await getSingleDealershipId(tx);
        const vehicle = await tx.vehicle.create({
          data: {
            ...draft,
            dealerId,
            createdById: session.user.id,
            updatedById: session.user.id,
            acquisitionDate: todayInDealershipTimezone(),
            status: "draft",
            inspectionStatus: "pending",
            isFeatured: false,
            publishedAt: null,
            reservedUntil: null,
            soldAt: null,
          },
          select: {
            id: true,
            version: true,
            stockNumber: true,
            slug: true,
          },
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
        return {
          vehicleId: vehicle.id,
          version: vehicle.version,
          stockNumber: vehicle.stockNumber,
          slug: vehicle.slug,
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

export async function updateVehicle(input: unknown) {
  const session = await requireSession();
  const parsed = updateVehicleSchema.parse(input);
  const { vehicleId, expectedVersion, mediaAssetIds, ...changes } = parsed;
  const current = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      version: true,
      slug: true,
      publishedAt: true,
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
  if (current.version !== expectedVersion) {
    throw new InventoryMutationError(
      409,
      "The vehicle changed since it was loaded. Reload it to review the latest version before saving.",
    );
  }
  if (
    (current.publishedAt ||
      ["published", "reserved", "sold"].includes(current.status)) &&
    changes.slug !== undefined &&
    changes.slug !== current.slug
  ) {
    throw new InventoryMutationError(
      422,
      "A vehicle slug cannot be changed after it has been published.",
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
  const media =
    mediaAssetIds !== undefined
      ? await loadMediaRows(mediaAssetIds, vehicleId)
      : undefined;
  if (media !== undefined) {
    assertPublicVehicleHasApprovedImage(current.status, media);
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const transactionMedia =
          mediaAssetIds !== undefined
            ? await assertMediaAvailableInTransaction(
                tx,
                mediaAssetIds,
                vehicleId,
              )
            : (
                await tx.vehicleMedia.findMany({
                  where: { vehicleId },
                  orderBy: { position: "asc" },
                  select: {
                    mediaAsset: {
                      select: {
                        type: true,
                        bucketAccess: true,
                        publicApprovedAt: true,
                        publicApprovedById: true,
                      },
                    },
                  },
                })
              ).map(({ mediaAsset }) => mediaAsset);
        assertPublicVehicleHasApprovedImage(current.status, transactionMedia);

        const update = await tx.vehicle.updateMany({
          where: {
            id: vehicleId,
            version: expectedVersion,
            status: current.status,
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
        if (media !== undefined) {
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
          mediaAssetIds: (
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

export async function transitionVehicleLifecycle(input: unknown) {
  const session = await requireSession();
  const parsed = vehicleLifecycleMutationSchema.parse(input);
  const { vehicleId, expectedVersion, status } = parsed;
  const snapshot = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      version: true,
      status: true,
      inspectionStatus: true,
      isFeatured: true,
      soldAt: true,
    },
  });
  if (!snapshot) {
    throw new InventoryMutationError(404, "Vehicle was not found.");
  }
  if (snapshot.version !== expectedVersion) {
    throw new InventoryMutationError(
      409,
      "The vehicle changed since it was loaded. Reload it before changing its status.",
    );
  }
  if (snapshot.status === status) {
    return {
      vehicleId,
      version: snapshot.version,
      status: snapshot.status,
      soldAt: snapshot.soldAt?.toISOString() ?? null,
      changed: false,
    };
  }

  if (status === "sold") {
    const attachments = await prisma.vehicleMedia.findMany({
      where: { vehicleId },
      orderBy: { position: "asc" },
      select: {
        mediaAssetId: true,
        mediaAsset: {
          select: {
            type: true,
            bucketAccess: true,
            publicApprovedAt: true,
            publicApprovedById: true,
          },
        },
      },
    });
    const approvedImageIds = attachments
      .filter(
        ({ mediaAsset }) =>
          mediaAsset.type === "image" &&
          mediaAsset.bucketAccess === "public_read" &&
          mediaAsset.publicApprovedAt !== null &&
          mediaAsset.publicApprovedById !== null,
      )
      .map(({ mediaAssetId }) => mediaAssetId);
    if (!approvedImageIds.length) {
      throw new InventoryMutationError(
        422,
        "A sold vehicle must retain at least one approved public image.",
      );
    }
    await loadMediaRows(approvedImageIds, vehicleId);
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const current = await tx.vehicle.findUnique({
          where: { id: vehicleId },
          select: {
            id: true,
            version: true,
            status: true,
            inspectionStatus: true,
            isFeatured: true,
            soldAt: true,
          },
        });
        if (!current) {
          throw new InventoryMutationError(404, "Vehicle was not found.");
        }
        if (current.version !== expectedVersion) {
          throw new InventoryMutationError(
            409,
            "The vehicle changed since it was loaded. Reload it before changing its status.",
          );
        }
        if (current.status === status) {
          return {
            vehicleId,
            version: current.version,
            status: current.status,
            soldAt: current.soldAt?.toISOString() ?? null,
            changed: false,
          };
        }

        const attachments = await tx.vehicleMedia.findMany({
          where: { vehicleId },
          orderBy: { position: "asc" },
          select: {
            mediaAsset: {
              select: {
                type: true,
                bucketAccess: true,
                publicApprovedAt: true,
                publicApprovedById: true,
              },
            },
          },
        });
        const mediaAssets = attachments.map(({ mediaAsset }) => mediaAsset);
        const lifecycle = resolveInventoryPolicyUpdate(
          current,
          { status },
          mediaAssets,
        );
        assertPublicVehicleHasApprovedImage(lifecycle.status, mediaAssets);

        const soldAt = status === "sold" ? new Date() : current.soldAt;
        const update = await tx.vehicle.updateMany({
          where: {
            id: vehicleId,
            version: expectedVersion,
            status: current.status,
          },
          data: {
            status: lifecycle.status,
            isFeatured: lifecycle.isFeatured,
            reservedUntil: null,
            soldAt,
            updatedById: session.user.id,
            version: { increment: 1 },
          },
        });
        if (update.count !== 1) {
          throw new InventoryMutationError(
            409,
            "The vehicle changed since it was loaded. Reload it before changing its status.",
          );
        }

        const version = expectedVersion + 1;
        await tx.vehicleChange.create({
          data: {
            vehicleId,
            actorId: session.user.id,
            version,
            previousStatus: current.status,
            status: lifecycle.status,
            previousInspectionStatus: current.inspectionStatus,
            inspectionStatus: lifecycle.inspectionStatus,
            previousSoldAt: current.soldAt,
            soldAt,
          },
        });

        return {
          vehicleId,
          version,
          status: lifecycle.status,
          soldAt: soldAt?.toISOString() ?? null,
          changed: true,
        };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (
      error instanceof InventoryMutationError ||
      error instanceof InventoryPolicyError
    ) {
      throw error;
    }
    prismaMutationError(error);
  }
}

export async function publishVehicle(input: unknown) {
  const session = await requireSession();
  const parsed = publishVehicleSchema.parse(input);
  const {
    vehicleId,
    expectedVersion,
    mediaAssetIds,
    ...vehicleFieldsWithConfirmation
  } = parsed;
  const { confirmInspectionPassed, ...vehicleFields } =
    vehicleFieldsWithConfirmation;
  if (!confirmInspectionPassed) {
    throw new InventoryMutationError(
      422,
      "Confirm that the vehicle passed inspection before publishing.",
    );
  }
  const current = vehicleId
    ? await prisma.vehicle.findUnique({
        where: { id: vehicleId },
        select: {
          id: true,
          version: true,
          slug: true,
          status: true,
          inspectionStatus: true,
          isFeatured: true,
          publishedAt: true,
          soldAt: true,
        },
      })
    : null;
  if (vehicleId && !current) {
    throw new InventoryMutationError(404, "Vehicle was not found.");
  }
  if (current && current.version !== expectedVersion) {
    throw new InventoryMutationError(
      409,
      "The vehicle changed since it was loaded. Reload it to review the latest version before publishing.",
    );
  }
  if (current && current.status !== "draft") {
    throw new InventoryMutationError(
      409,
      "Only a draft vehicle can be published from this action.",
    );
  }
  if (current?.publishedAt && vehicleFields.slug !== current.slug) {
    throw new InventoryMutationError(
      422,
      "A vehicle slug cannot be changed after it has been published.",
    );
  }

  assertValidConsumption(vehicleFields);
  const media = await loadMediaRows(mediaAssetIds, vehicleId);
  const currentPolicy = current ?? {
    status: "draft" as const,
    inspectionStatus: "pending" as const,
    isFeatured: false,
  };
  const publication = {
    status: "published" as const,
    inspectionStatus: "passed" as const,
  };
  resolveInventoryPolicyUpdate(currentPolicy, publication, media);
  const publishedAt = current?.publishedAt ?? new Date();

  try {
    return await prisma.$transaction(
      async (tx) => {
        const transactionMedia = await assertMediaAvailableInTransaction(
          tx,
          mediaAssetIds,
          vehicleId,
        );
        const lifecycle = resolveInventoryPolicyUpdate(
          currentPolicy,
          publication,
          transactionMedia,
        );

        if (!current) {
          const dealershipId = await getSingleDealershipId(tx);
          const vehicle = await tx.vehicle.create({
            data: {
              ...vehicleFields,
              dealerId: dealershipId,
              createdById: session.user.id,
              updatedById: session.user.id,
              acquisitionDate: todayInDealershipTimezone(),
              status: lifecycle.status,
              inspectionStatus: lifecycle.inspectionStatus,
              isFeatured: lifecycle.isFeatured,
              publishedAt,
            },
            select: { id: true, version: true },
          });
          await tx.vehicleChange.create({
            data: {
              vehicleId: vehicle.id,
              actorId: session.user.id,
              version: vehicle.version,
              previousStatus: null,
              status: lifecycle.status,
              previousInspectionStatus: null,
              inspectionStatus: lifecycle.inspectionStatus,
              previousSoldAt: null,
              soldAt: null,
            },
          });
          await tx.vehicleMedia.createMany({
            data: transactionMedia.map((asset, position) => ({
              vehicleId: vehicle.id,
              mediaAssetId: asset.id,
              position,
            })),
          });
          return {
            vehicleId: vehicle.id,
            version: vehicle.version,
            mediaAssetIds,
            created: true,
          };
        }

        const update = await tx.vehicle.updateMany({
          where: {
            id: current.id,
            version: current.version,
            status: "draft",
          },
          data: {
            ...vehicleFields,
            updatedById: session.user.id,
            version: { increment: 1 },
            status: lifecycle.status,
            inspectionStatus: lifecycle.inspectionStatus,
            isFeatured: lifecycle.isFeatured,
            publishedAt,
            soldAt: null,
          },
        });
        if (update.count !== 1) {
          throw new InventoryMutationError(
            409,
            "The vehicle changed since it was loaded. Reload it to review the latest version before publishing.",
          );
        }

        const version = current.version + 1;
        await tx.vehicleChange.create({
          data: {
            vehicleId: current.id,
            actorId: session.user.id,
            version,
            previousStatus: current.status,
            status: lifecycle.status,
            previousInspectionStatus: current.inspectionStatus,
            inspectionStatus: lifecycle.inspectionStatus,
            previousSoldAt: current.soldAt,
            soldAt: null,
          },
        });
        await tx.vehicleMedia.deleteMany({
          where: { vehicleId: current.id },
        });
        await tx.vehicleMedia.createMany({
          data: transactionMedia.map((asset, position) => ({
            vehicleId: current.id,
            mediaAssetId: asset.id,
            position,
          })),
        });

        return {
          vehicleId: current.id,
          version,
          mediaAssetIds,
          created: false,
        };
      },
      { isolationLevel: "Serializable" },
    );
  } catch (error) {
    if (
      error instanceof InventoryMutationError ||
      error instanceof InventoryPolicyError
    ) {
      throw error;
    }
    prismaMutationError(error);
  }
}
