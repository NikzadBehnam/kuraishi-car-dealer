import { z } from "zod";

export const DEFAULT_INVENTORY_PAGE_SIZE = 8;
export const MAX_INVENTORY_SELECTION_SIZE = 100;

const maximumInventoryOffset = 2_147_483_647;

export const vehicleStatusSchema = z.enum([
  "draft",
  "published",
  "reserved",
  "sold",
  "archived",
]);

export const inventorySortSchema = z.enum([
  "title",
  "price",
  "mileage",
  "status",
  "location",
  "lastUpdatedAt",
]);

export const inventorySortDirectionSchema = z.enum(["asc", "desc"]);

export const staffInventoryFiltersSchema = z.strictObject({
  search: z.string().trim().max(100).default(""),
  status: vehicleStatusSchema.optional(),
  sort: inventorySortSchema.default("lastUpdatedAt"),
  direction: inventorySortDirectionSchema.default("desc"),
});

export type StaffInventoryFilters = z.infer<typeof staffInventoryFiltersSchema>;

export const staffInventorySearchParamsSchema =
  staffInventoryFiltersSchema.extend({
    page: z
      .string()
      .regex(/^[1-9]\d*$/)
      .default("1")
      .transform(Number)
      .pipe(
        z
          .number()
          .int()
          .positive()
          .refine(Number.isSafeInteger)
          .refine(
            (page) =>
              Number.isSafeInteger((page - 1) * DEFAULT_INVENTORY_PAGE_SIZE) &&
              (page - 1) * DEFAULT_INVENTORY_PAGE_SIZE <=
                maximumInventoryOffset,
          ),
      ),
  });

export const inspectionStatusSchema = z.enum([
  "pending",
  "in_progress",
  "passed",
  "failed",
]);

const earliestFirstRegistrationMonth = "1886-01";

function currentMonthInVienna() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
  }).formatToParts();
  const year = parts.find(({ type }) => type === "year")?.value;
  const month = parts.find(({ type }) => type === "month")?.value;
  if (!year || !month) {
    throw new Error("Could not determine the current dealership month.");
  }
  return `${year}-${month}`;
}

export const firstRegistrationMonthSchema = z
  .string()
  .regex(
    /^[0-9]{4}-(0[1-9]|1[0-2])$/,
    "Use a valid YYYY-MM registration month.",
  )
  .refine(
    (month) =>
      month >= earliestFirstRegistrationMonth &&
      month <= currentMonthInVienna(),
    "First registration must be between 1886-01 and the current month.",
  );

// Opaque URL-safe identifiers; Section 02 chooses the database ID generator.
export const inventoryIdSchema = z
  .string()
  .min(1, "Vehicle ID is required.")
  .max(128, "Vehicle ID is too long.")
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Invalid vehicle ID.");

export const inventorySelectionSchema = z.strictObject({
  ids: z
    .array(inventoryIdSchema)
    .min(1, "Select at least one vehicle.")
    .max(
      MAX_INVENTORY_SELECTION_SIZE,
      `Select no more than ${MAX_INVENTORY_SELECTION_SIZE} vehicles at a time.`,
    )
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Selected vehicle IDs must be unique.",
    }),
});

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

export const inventoryPaginationInputSchema = z.strictObject({
  page: z.number().int().min(1).default(1),
  pageSize: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(DEFAULT_INVENTORY_PAGE_SIZE),
});

export const inventoryPaginationSchema = inventoryPaginationInputSchema
  .transform(({ page, pageSize }) => ({
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  }))
  .refine(
    ({ skip }) => Number.isSafeInteger(skip) && skip <= maximumInventoryOffset,
    {
      message: "Pagination offset is too large.",
    },
  );

export const inventorySlugSchema = z
  .string()
  .min(1, "Vehicle slug is required.")
  .max(200, "Vehicle slug is too long.")
  .regex(/^[\p{L}\p{N}]+(?:[-_][\p{L}\p{N}]+)*$/u, "Invalid vehicle slug.");
