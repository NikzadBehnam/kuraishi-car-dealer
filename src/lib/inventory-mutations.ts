import "server-only";

import { randomUUID } from "node:crypto";
import { photoIdsSchema } from "./vehicle-photo-validation.ts";
import { Prisma } from "../generated/prisma/client.ts";
import { z } from "zod";

import { prisma } from "./db.ts";
import { dealershipDate } from "./business-date.ts";
import {
  queuePhotoDeletions,
  saveVehiclePhotos,
} from "./vehicle-photo-mutations.ts";
import {
  sweepPhotoDeletions,
  VehiclePhotoError,
} from "./vehicle-photo-uploads.ts";
import {
  firstRegistrationMonthSchema,
  inventoryIdSchema,
  inspectionStatusSchema,
  inventorySlugSchema,
  inventorySelectionSchema,
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
  photoIds: photoIdsSchema.default([]),
  inspectionStatus: inspectionStatusSchema.default("pending"),
  isFeatured: z.boolean().default(false),
});

export const updateVehicleSchema = vehicleDraftFieldsSchema
  .partial()
  .extend({
    vehicleId: inventoryIdSchema,
    expectedVersion: z.number().int().min(1).max(2_147_483_647),
    photoIds: photoIdsSchema.optional(),
    inspectionStatus: inspectionStatusSchema.optional(),
    isFeatured: z.boolean().optional(),
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
  status: z.enum(["draft", "published", "reserved", "sold", "archived"]),
});

export const bulkVehicleLifecycleMutationSchema =
  inventorySelectionSchema.extend({
    status: z.enum(["sold", "archived"]),
  });

const MAX_BULK_LIFECYCLE_CONCURRENCY = 5;

export const duplicateVehicleMutationSchema = z.strictObject({
  vehicleId: inventoryIdSchema,
  expectedVersion: z.number().int().min(1).max(2_147_483_647),
});

export const deleteVehicleMutationSchema = z.strictObject({
  vehicleId: inventoryIdSchema,
  expectedVersion: z.number().int().min(1).max(2_147_483_647),
  confirmPermanently: z.literal(true),
});

export const publishVehicleSchema = vehicleDraftFieldsSchema
  .extend({
    photoIds: photoIdsSchema,
    inspectionStatus: z.literal("passed", {
      error: "Set Inspection to Passed before publishing.",
    }),
    isFeatured: z.boolean().optional(),
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

function assertPublicVehicleHasPhoto(status: string, count: number) {
  if (["published", "reserved", "sold"].includes(status) && count === 0) {
    throw new InventoryMutationError(
      422,
      "Keep at least one photo on a published, reserved, or sold vehicle.",
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
  return new Date(`${dealershipDate(now)}T00:00:00.000Z`);
}

function prismaMutationError(error: unknown): never {
  if (error instanceof VehiclePhotoError)
    throw new InventoryMutationError(422, error.message);
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
  const { photoIds, isFeatured: featureOnPublish, ...vehicleFields } = parsed;

  try {
    return await prisma.$transaction(
      async (tx) => {
        const dealershipId = await getSingleDealershipId(tx);
        const vehicle = await tx.vehicle.create({
          data: {
            ...vehicleFields,
            dealerId: dealershipId,
            createdById: session.user.id,
            updatedById: session.user.id,
            acquisitionDate: todayInDealershipTimezone(),
            status: "draft",
            featureOnPublish,
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
            inspectionStatus: parsed.inspectionStatus,
          },
        });
        await saveVehiclePhotos(
          tx,
          vehicle.id,
          photoIds,
          session.user.id,
          true,
        );
        return {
          vehicleId: vehicle.id,
          version: vehicle.version,
          photoIds,
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

export async function deleteDraftVehicle(input: unknown) {
  await requireSession();
  const { vehicleId, expectedVersion } =
    deleteVehicleMutationSchema.parse(input);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const current = await tx.vehicle.findUnique({
          where: { id: vehicleId },
          select: {
            version: true,
            status: true,
            publishedAt: true,
            changes: {
              where: {
                OR: [{ status: "published" }, { previousStatus: "published" }],
              },
              select: { id: true },
              take: 1,
            },
          },
        });
        if (!current) {
          throw new InventoryMutationError(404, "Vehicle was not found.");
        }
        if (current.version !== expectedVersion) {
          throw new InventoryMutationError(
            409,
            "The vehicle changed since it was loaded. Reload it before deleting.",
          );
        }
        if (
          current.status !== "draft" ||
          current.publishedAt !== null ||
          current.changes.length > 0
        ) {
          throw new InventoryMutationError(
            409,
            "Only never-published draft vehicles can be permanently deleted. Archive published vehicles instead.",
          );
        }

        await queuePhotoDeletions(
          tx,
          await tx.vehiclePhoto.findMany({
            where: { vehicleId },
            select: { objectKey: true },
          }),
        );
        await tx.vehicleChange.deleteMany({ where: { vehicleId } });
        const deleted = await tx.vehicle.deleteMany({
          where: {
            id: vehicleId,
            version: expectedVersion,
            status: "draft",
            publishedAt: null,
          },
        });
        if (deleted.count !== 1) {
          throw new InventoryMutationError(
            409,
            "The vehicle changed since it was loaded. Reload it before deleting.",
          );
        }
        return { vehicleId, deleted: true as const };
      },
      { isolationLevel: "Serializable" },
    );
    await sweepPhotoDeletions();
    return result;
  } catch (error) {
    if (error instanceof InventoryMutationError) {
      throw error;
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new InventoryMutationError(
        409,
        "This vehicle has linked records and cannot be permanently deleted.",
      );
    }
    prismaMutationError(error);
  }
}

export async function updateVehicle(input: unknown) {
  const session = await requireSession();
  const parsed = updateVehicleSchema.parse(input);
  const {
    vehicleId,
    expectedVersion,
    photoIds,
    inspectionStatus,
    isFeatured,
    ...changes
  } = parsed;
  const current = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: {
      id: true,
      version: true,
      slug: true,
      publishedAt: true,
      status: true,
      inspectionStatus: true,
      isFeatured: true,
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
  if (
    isFeatured &&
    current.status !== "draft" &&
    current.status !== "published"
  ) {
    throw new InventoryMutationError(
      422,
      "Only draft or published vehicles can be selected for Featured placement.",
    );
  }
  const lifecycle = resolveInventoryPolicyUpdate(current, {
    status: current.status,
    inspectionStatus,
    isFeatured,
  });
  const withdrawn = lifecycle.status !== current.status;
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        assertPublicVehicleHasPhoto(
          lifecycle.status,
          photoIds?.length ??
            (await tx.vehiclePhoto.count({ where: { vehicleId } })),
        );

        const update = await tx.vehicle.updateMany({
          where: {
            id: vehicleId,
            version: expectedVersion,
            status: current.status,
          },
          data: {
            ...changes,
            status: lifecycle.status,
            inspectionStatus: lifecycle.inspectionStatus,
            isFeatured: lifecycle.isFeatured,
            featureOnPublish: current.status === "draft" ? isFeatured : false,
            ...(withdrawn ? { reservedUntil: null } : {}),
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
            status: lifecycle.status,
            previousInspectionStatus: current.inspectionStatus,
            inspectionStatus: lifecycle.inspectionStatus,
            previousSoldAt: current.soldAt,
            soldAt: current.soldAt,
          },
        });
        if (photoIds)
          await saveVehiclePhotos(
            tx,
            vehicleId,
            photoIds,
            session.user.id,
            false,
          );
        return {
          vehicleId,
          version,
          withdrawn,
          photoIds:
            photoIds ??
            (
              await tx.vehiclePhoto.findMany({
                where: { vehicleId },
                orderBy: { position: "asc" },
                select: { id: true },
              })
            ).map(({ id }) => id),
        };
      },
      { isolationLevel: "Serializable" },
    );
    if (photoIds) await sweepPhotoDeletions();
    return result;
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
  return transitionVehicleLifecycleForSession(session, parsed);
}

async function transitionVehicleLifecycleForSession(
  session: Awaited<ReturnType<typeof requireSession>>,
  parsed: z.infer<typeof vehicleLifecycleMutationSchema>,
) {
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

        if (status === "draft" && current.status !== "sold") {
          throw new InventoryMutationError(
            422,
            "Only sold vehicles can be returned to draft using this action.",
          );
        }

        const photoCount = await tx.vehiclePhoto.count({
          where: { vehicleId },
        });
        const lifecycle = resolveInventoryPolicyUpdate(
          current,
          { status },
          photoCount,
        );
        assertPublicVehicleHasPhoto(lifecycle.status, photoCount);

        const soldAt =
          lifecycle.status === "sold"
            ? new Date()
            : lifecycle.status === "draft"
              ? null
              : current.soldAt;
        const update = await tx.vehicle.updateMany({
          where: {
            id: vehicleId,
            version: expectedVersion,
            status: current.status,
          },
          data: {
            status: lifecycle.status,
            isFeatured: lifecycle.isFeatured,
            featureOnPublish: false,
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

export async function bulkTransitionVehicles(input: unknown) {
  const session = await requireSession();
  const { ids, status } = bulkVehicleLifecycleMutationSchema.parse(input);
  const outcomes = new Array<
    | { vehicleId: string; changed: boolean }
    | { vehicleId: string; error: string }
  >(ids.length);
  let nextIndex = 0;

  const processNext = async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= ids.length) {
        return;
      }

      const vehicleId = ids[index];
      try {
        const snapshot = await prisma.vehicle.findUnique({
          where: { id: vehicleId },
          select: { version: true },
        });
        if (!snapshot) {
          throw new InventoryMutationError(404, "Vehicle was not found.");
        }

        const result = await transitionVehicleLifecycleForSession(session, {
          vehicleId,
          expectedVersion: snapshot.version,
          status,
        });
        outcomes[index] = { vehicleId, changed: result.changed };
      } catch (error) {
        if (
          error instanceof InventoryMutationError ||
          error instanceof InventoryPolicyError
        ) {
          outcomes[index] = { vehicleId, error: error.message };
          continue;
        }

        console.error("Bulk vehicle lifecycle item failed.", {
          vehicleId,
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
        outcomes[index] = {
          vehicleId,
          error: "Could not update this vehicle.",
        };
      }
    }
  };

  const workerCount = Math.min(MAX_BULK_LIFECYCLE_CONCURRENCY, ids.length);
  await Promise.all(Array.from({ length: workerCount }, () => processNext()));

  return {
    status,
    succeeded: outcomes.filter(
      (outcome): outcome is { vehicleId: string; changed: boolean } =>
        "changed" in outcome,
    ),
    failed: outcomes.filter(
      (outcome): outcome is { vehicleId: string; error: string } =>
        "error" in outcome,
    ),
  };
}

export async function publishVehicle(input: unknown) {
  const session = await requireSession();
  const parsed = publishVehicleSchema.parse(input);
  const { vehicleId, expectedVersion, photoIds, ...vehicleFieldsWithPolicy } =
    parsed;
  const { inspectionStatus, isFeatured, ...vehicleFields } =
    vehicleFieldsWithPolicy;
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
          featureOnPublish: true,
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
  const currentPolicy = current ?? {
    status: "draft" as const,
    inspectionStatus: "pending" as const,
    isFeatured: false,
  };
  const publication = {
    status: "published" as const,
    inspectionStatus,
    isFeatured: isFeatured ?? current?.featureOnPublish ?? false,
  };
  const lifecycle = resolveInventoryPolicyUpdate(
    currentPolicy,
    publication,
    photoIds.length,
  );
  const publishedAt = current?.publishedAt ?? new Date();

  try {
    const result = await prisma.$transaction(
      async (tx) => {
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
          await saveVehiclePhotos(
            tx,
            vehicle.id,
            photoIds,
            session.user.id,
            true,
          );
          return {
            vehicleId: vehicle.id,
            version: vehicle.version,
            photoIds,
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
            featureOnPublish: false,
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
        await saveVehiclePhotos(
          tx,
          current.id,
          photoIds,
          session.user.id,
          false,
        );

        return {
          vehicleId: current.id,
          version,
          photoIds,
          created: false,
        };
      },
      { isolationLevel: "Serializable" },
    );
    if (current) await sweepPhotoDeletions();
    return result;
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
