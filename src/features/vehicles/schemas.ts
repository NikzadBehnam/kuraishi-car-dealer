import { z } from "zod";

import {
  booleanQuerySchema,
  domainFieldLimits,
  normalizeSlug,
  optionalNormalizedTextSchema,
  optionalSearchSchema,
  paginationQueryShape,
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
export type AdminVehicleListQuery = z.infer<
  typeof adminVehicleListQuerySchema
>;

export const vehicleQueryLimits = {
  search: domainFieldLimits.search,
  maximumPriceCents: maxPrismaInt,
  maximumMileage: 5_000_000,
} as const;
