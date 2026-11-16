import { z } from "zod";

export const vehicleStatusSchema = z.enum([
  "draft",
  "published",
  "reserved",
  "sold",
  "archived",
]);

export const inspectionStatusSchema = z.enum([
  "pending",
  "in_progress",
  "passed",
  "failed",
]);

// Opaque URL-safe identifiers; Section 02 chooses the database ID generator.
export const inventoryIdSchema = z
  .string()
  .min(1, "Vehicle ID is required.")
  .max(128, "Vehicle ID is too long.")
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Invalid vehicle ID.");

export const inventoryPolicyStateSchema = z.strictObject({
  status: vehicleStatusSchema,
  inspectionStatus: inspectionStatusSchema,
  isFeatured: z.boolean(),
});

export const inventoryPolicyUpdateSchema = inventoryPolicyStateSchema
  .partial()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide at least one inventory policy change.",
  });
