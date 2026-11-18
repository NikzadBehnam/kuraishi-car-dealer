import { z } from "zod";

import {
  inspectionStatusSchema,
  vehicleStatusSchema,
} from "@/lib/inventory-validation";

const requiredText = (label: string) =>
  z.string().refine((value) => value.trim().length > 0, {
    message: `${label} is required.`,
  });

const optionalNumber = z.number().finite().optional();
const nonnegativeNumber = optionalNumber.refine(
  (value) => value === undefined || value >= 0,
  "Value cannot be negative.",
);
const optionalMonth = z
  .string()
  .regex(/^$|^[0-9]{4}-(0[1-9]|1[0-2])$/, "Use a valid registration month.")
  .optional();

export const vehicleFormSchema = z
  .object({
    make: requiredText("Make"),
    model: requiredText("Model"),
    variant: z.string().optional(),
    stockNumber: requiredText("Stock number"),
    slug: requiredText("Slug"),
    description: z.string().optional(),
    price: optionalNumber.refine(
      (value) => value === undefined || value > 0,
      "Price must be greater than zero.",
    ),
    marginEstimate: nonnegativeNumber,
    firstRegistration: optionalMonth,
    mileage: nonnegativeNumber.refine(
      (value) => value === undefined || Number.isInteger(value),
      "Mileage must be a whole number.",
    ),
    powerKw: optionalNumber.refine(
      (value) => value === undefined || value > 0,
      "Power must be greater than zero.",
    ),
    fuelType: z.enum(["petrol", "diesel", "electric", "hybrid"]).optional(),
    transmissionType: z.enum(["automatic", "manual"]).optional(),
    bodyType: z
      .enum(["suv", "compact", "sedan", "wagon", "van", "sports"])
      .optional(),
    exteriorColor: z.string().optional(),
    location: z.string().optional(),
    condition: z.enum(["used", "demonstrator", "annual"]).optional(),
    ownerCount: nonnegativeNumber.refine(
      (value) => value === undefined || Number.isInteger(value),
      "Owner count must be a whole number.",
    ),
    vinLastSix: z
      .string()
      .regex(/^$|^[A-Za-z0-9]{6}$/, "VIN ending must contain six characters.")
      .optional(),
    consumption: nonnegativeNumber,
    consumptionUnit: z.enum(["l_per_100_km", "kwh_per_100_km"]).optional(),
    co2Emission: nonnegativeNumber.refine(
      (value) => value === undefined || Number.isInteger(value),
      "CO2 emission must be a whole number.",
    ),
    featuresText: z.string().optional(),
    labelsText: z.string().optional(),
    mediaAssetIds: z
      .array(z.string().min(1).max(128))
      .max(20, "A vehicle can have at most 20 images.")
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "An image cannot be attached more than once.",
      }),
    status: vehicleStatusSchema,
    inspectionStatus: inspectionStatusSchema,
    isFeatured: z.boolean(),
    isAvailable: z.boolean(),
  })
  .refine(
    (values) =>
      values.consumption === undefined || values.consumptionUnit !== undefined,
    {
      path: ["consumptionUnit"],
      message: "Choose a unit for the consumption value.",
    },
  )
  .refine(
    ({ fuelType, consumption }) =>
      consumption === undefined || fuelType !== undefined,
    {
      path: ["fuelType"],
      message: "Choose a fuel type when entering consumption.",
    },
  )
  .refine(
    ({ fuelType, consumption, consumptionUnit }) =>
      consumption === undefined ||
      !(
        (["petrol", "diesel"].includes(fuelType ?? "") &&
          consumptionUnit !== "l_per_100_km") ||
        (fuelType === "electric" && consumptionUnit !== "kwh_per_100_km")
      ),
    {
      path: ["consumptionUnit"],
      message: "The consumption unit must match the fuel type.",
    },
  );

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
