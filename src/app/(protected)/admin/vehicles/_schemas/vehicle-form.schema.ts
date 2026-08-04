import { z } from "zod";

export const vehicleFormSchema = z.object({
  make: z.string().min(1, "Make is required."),
  model: z.string().min(1, "Model is required."),
  variant: z.string().min(1, "Variant is required."),
  stockNumber: z.string().min(1, "Stock number is required."),
  slug: z.string().min(1, "Slug is required."),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters."),
  price: z.number().min(1, "Price must be greater than zero."),
  marginEstimate: z.number().min(0, "Margin estimate cannot be negative."),
  firstRegistration: z.string().min(1, "First registration is required."),
  mileage: z.number().min(0, "Mileage cannot be negative."),
  powerKw: z.number().min(1, "Power must be greater than zero."),
  fuelType: z.enum(["petrol", "diesel", "electric", "hybrid"]),
  transmissionType: z.enum(["automatic", "manual"]),
  bodyType: z.enum(["suv", "compact", "sedan", "wagon", "van", "sports"]),
  exteriorColor: z.string().min(1, "Exterior color is required."),
  location: z.string().min(1, "Location is required."),
  condition: z.enum(["used", "demonstrator", "annual"]),
  ownerCount: z.number().min(0, "Owner count cannot be negative."),
  vinLastSix: z
    .string()
    .length(6, "VIN ending must contain exactly six characters."),
  consumption: z.number().min(0).optional(),
  co2Emission: z.number().min(0).optional(),
  featuresText: z.string().min(1, "Add at least one feature."),
  labelsText: z.string().optional(),
  status: z.enum(["draft", "published", "reserved", "sold", "archived"]),
  inspectionStatus: z.enum(["pending", "in_progress", "passed", "failed"]),
  isFeatured: z.boolean(),
  isAvailable: z.boolean(),
});

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
