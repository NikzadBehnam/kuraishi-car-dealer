import { z } from "zod";

import { inventoryPaginationSchema } from "./inventory-validation.ts";

export const mediaLibraryQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
  search: z.string().trim().max(200).default(""),
  type: z.enum(["all", "image", "document", "brand"]).default("all"),
  usage: z.enum(["all", "vehicle", "brand", "legal", "unused"]).default("all"),
});

export const mediaLibraryPageSchema = z.strictObject({
  assets: z.array(
    z.strictObject({
      id: z.string().min(1),
      type: z.enum(["image", "document", "brand"]),
      usage: z.enum(["vehicle", "brand", "legal", "unused"]),
      title: z.string(),
      filename: z.string(),
      url: z.string().url(),
      alt: z.string(),
      sizeKb: z.number().int().nonnegative(),
      width: z.number().int().positive().optional(),
      height: z.number().int().positive().optional(),
      usedByVehicleId: z.string().min(1).optional(),
      usedByVehicle: z
        .strictObject({
          id: z.string().min(1),
          make: z.string(),
          model: z.string(),
        })
        .optional(),
      uploadedAt: z.string().datetime({ offset: true }),
    }),
  ),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(100),
  hasMore: z.boolean(),
});

export const mediaLibraryErrorSchema = z.strictObject({
  error: z.string().min(1),
});

export function parseMediaLibraryQuery(input: unknown) {
  const query = mediaLibraryQuerySchema.parse(input);
  const { skip, take } = inventoryPaginationSchema.parse({
    page: query.page,
    pageSize: query.pageSize,
  });

  return { ...query, skip, take };
}
