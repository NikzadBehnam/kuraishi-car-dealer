import { z } from "zod";

import {
  booleanQuerySchema,
  domainFieldLimits,
  normalizeMultilineText,
  normalizeStringList,
  normalizeSlug,
  normalizedTextSchema,
  optionalNormalizedTextSchema,
  optionalSearchSchema,
  paginationQueryShape,
  resourceIdSchema,
  sortDirectionSchema,
} from "../shared/schemas.ts";
import {
  adminVehicleSortFields,
  publicVehicleSorts,
  vehicleBodyTypes,
  vehicleConditions,
  vehicleFuelTypes,
  vehicleInspectionStatuses,
  vehicleStatuses,
  vehicleTransmissionTypes,
} from "./constants.ts";

const maxPrismaInt = 2_147_483_647;
const yearMonthPattern = /^\d{4}-(?:0[1-9]|1[0-2])$/u;

export const vehicleFuelTypeSchema = z.enum(vehicleFuelTypes);
export const vehicleTransmissionTypeSchema = z.enum(vehicleTransmissionTypes);
export const vehicleBodyTypeSchema = z.enum(vehicleBodyTypes);
export const vehicleConditionSchema = z.enum(vehicleConditions);
export const vehicleStatusSchema = z.enum(vehicleStatuses);
export const vehicleInspectionStatusSchema = z.enum(vehicleInspectionStatuses);
export const publicVehicleSortSchema = z.enum(publicVehicleSorts);
export const adminVehicleSortFieldSchema = z.enum(adminVehicleSortFields);

export const vehicleSlugSchema = z
  .string()
  .transform(normalizeSlug)
  .pipe(
    z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u),
  );

export const vehicleStockNumberSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .transform((value) => value.toUpperCase());

export const vehicleVinLastSixSchema = z
  .string()
  .trim()
  .length(6)
  .regex(/^[A-HJ-NPR-Z0-9]{6}$/iu)
  .transform((value) => value.toUpperCase());

const normalizedVehicleStringListSchema = z
  .array(normalizedTextSchema(domainFieldLimits.shortText))
  .max(100)
  .transform((values) => normalizeStringList(values));

const nullableVehicleIntegerSchema = z
  .number()
  .int()
  .min(0)
  .max(maxPrismaInt)
  .nullable();

export const vehicleWriteInputSchema = z.object({
  bodyType: vehicleBodyTypeSchema,
  co2Emission: z.number().int().min(0).max(5_000).nullable(),
  condition: vehicleConditionSchema,
  consumption: z.number().min(0).max(100).nullable(),
  description: z
    .string()
    .transform(normalizeMultilineText)
    .pipe(z.string().min(20).max(10_000)),
  exteriorColor: normalizedTextSchema(80),
  features: normalizedVehicleStringListSchema.pipe(z.array(z.string()).min(1)),
  firstRegistration: z.string().regex(yearMonthPattern),
  fuelType: vehicleFuelTypeSchema,
  inspectionStatus: vehicleInspectionStatusSchema,
  isFeatured: z.boolean(),
  labels: normalizedVehicleStringListSchema.pipe(z.array(z.string()).max(20)),
  make: normalizedTextSchema(80),
  marginEstimateCents: nullableVehicleIntegerSchema,
  mileage: z.number().int().min(0).max(5_000_000),
  model: normalizedTextSchema(80),
  ownerCount: z.number().int().min(0).max(20),
  powerKw: z.number().int().min(1).max(2_000),
  priceCents: z.number().int().min(1).max(maxPrismaInt),
  slug: vehicleSlugSchema,
  status: vehicleStatusSchema,
  stockNumber: vehicleStockNumberSchema,
  transmissionType: vehicleTransmissionTypeSchema,
  variant: normalizedTextSchema(domainFieldLimits.shortText),
  vinLastSix: vehicleVinLastSixSchema,
});

export const createVehicleInputSchema = vehicleWriteInputSchema;

export const updateVehicleInputSchema = z.object({
  id: resourceIdSchema,
  vehicle: vehicleWriteInputSchema,
});

export const vehicleLifecycleCommandSchema = z.object({
  id: resourceIdSchema,
  status: vehicleStatusSchema,
});

export const bulkVehicleLifecycleCommandSchema = z.object({
  ids: z
    .array(resourceIdSchema)
    .min(1)
    .max(domainFieldLimits.bulkIds)
    .transform((ids) => Array.from(new Set(ids))),
  status: vehicleStatusSchema,
});

export const duplicateVehicleCommandSchema = z.object({
  id: resourceIdSchema,
});

const publicVehicleListQueryBaseSchema = z.object({
  ...paginationQueryShape,
  bodyType: vehicleBodyTypeSchema.optional(),
  condition: vehicleConditionSchema.optional(),
  featured: booleanQuerySchema.optional(),
  fuelType: vehicleFuelTypeSchema.optional(),
  make: optionalNormalizedTextSchema(80),
  maximumMileage: z.coerce.number().int().min(0).max(5_000_000).optional(),
  maximumPriceCents: z.coerce
    .number()
    .int()
    .min(0)
    .max(maxPrismaInt)
    .optional(),
  minimumPriceCents: z.coerce
    .number()
    .int()
    .min(0)
    .max(maxPrismaInt)
    .optional(),
  model: optionalNormalizedTextSchema(80),
  search: optionalSearchSchema,
  sort: publicVehicleSortSchema.default("featured"),
  transmissionType: vehicleTransmissionTypeSchema.optional(),
});

export const publicVehicleListQuerySchema =
  publicVehicleListQueryBaseSchema.superRefine((query, context) => {
    if (
      query.minimumPriceCents !== undefined &&
      query.maximumPriceCents !== undefined &&
      query.minimumPriceCents > query.maximumPriceCents
    ) {
      context.addIssue({
        code: "custom",
        message: "Minimum price cannot exceed maximum price.",
        path: ["minimumPriceCents"],
      });
    }
  });

export const adminVehicleListQuerySchema = z.object({
  ...paginationQueryShape,
  inspectionStatus: vehicleInspectionStatusSchema.optional(),
  search: optionalSearchSchema,
  sortDirection: sortDirectionSchema.default("desc"),
  sortField: adminVehicleSortFieldSchema.default("updatedAt"),
  status: vehicleStatusSchema.optional(),
});

export type PublicVehicleListQuery = z.infer<
  typeof publicVehicleListQuerySchema
>;
export type AdminVehicleListQuery = z.infer<typeof adminVehicleListQuerySchema>;
export type VehicleWriteInput = z.infer<typeof vehicleWriteInputSchema>;
export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleInputSchema>;
export type VehicleLifecycleCommand = z.infer<
  typeof vehicleLifecycleCommandSchema
>;
export type BulkVehicleLifecycleCommand = z.infer<
  typeof bulkVehicleLifecycleCommandSchema
>;

export const vehicleQueryLimits = {
  search: domainFieldLimits.search,
  maximumPriceCents: maxPrismaInt,
  maximumMileage: 5_000_000,
} as const;
