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

export const inventoryPaginationSchema = z
  .strictObject({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(100).default(8),
  })
  .transform(({ page, pageSize }) => ({
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }))
  .refine(({ skip }) => Number.isSafeInteger(skip) && skip <= 2_147_483_647, {
    message: "Pagination offset is too large.",
  });
