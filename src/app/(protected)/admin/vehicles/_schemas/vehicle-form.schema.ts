import { z } from "zod";

import {
  vehicleBodyTypeSchema,
  vehicleConditionSchema,
  vehicleFuelTypeSchema,
  vehicleInspectionStatusSchema,
  vehicleStatusSchema,
  vehicleStockNumberSchema,
  vehicleTransmissionTypeSchema,
  vehicleVinLastSixSchema,
} from "@/features/vehicles/schemas";

export const vehicleFormSchema = z.object({
  make: z.string().trim().min(1, "Make is required.").max(80),
  model: z.string().trim().min(1, "Model is required.").max(80),
  variant: z.string().trim().min(1, "Variant is required.").max(160),
  stockNumber: vehicleStockNumberSchema,
  slug: z.string().trim().min(1, "Slug is required.").max(120),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters."),
  price: z
    .number()
    .min(0.01, "Price must be greater than zero.")
    .refine((value) => Number.isInteger(value * 100), {
      message: "Price can have at most two decimal places.",
    }),
  marginEstimate: z.number().min(0).optional(),
  firstRegistration: z
    .string()
    .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/u, "Use YYYY-MM format."),
  mileage: z.number().int().min(0, "Mileage cannot be negative."),
  powerKw: z.number().int().min(1, "Power must be greater than zero."),
  fuelType: vehicleFuelTypeSchema,
  transmissionType: vehicleTransmissionTypeSchema,
  bodyType: vehicleBodyTypeSchema,
  exteriorColor: z.string().min(1, "Exterior color is required."),
  condition: vehicleConditionSchema,
  ownerCount: z.number().int().min(0, "Owner count cannot be negative."),
  vinLastSix: vehicleVinLastSixSchema,
  consumption: z.number().min(0).optional(),
  co2Emission: z.number().int().min(0).optional(),
  featuresText: z.string().min(1, "Add at least one feature."),
  labelsText: z.string().optional(),
  status: vehicleStatusSchema,
  inspectionStatus: vehicleInspectionStatusSchema,
  isFeatured: z.boolean(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
