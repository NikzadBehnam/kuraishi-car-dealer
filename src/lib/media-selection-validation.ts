import { z } from "zod";

export const MAX_MEDIA_SELECTION_ASSETS = 20;
export const MAX_MEDIA_DOWNLOAD_BYTES = 50 * 1024 * 1024;

export const mediaAssetIdsSchema = z
  .array(
    z
      .string()
      .min(1)
      .max(64)
      .regex(/^[A-Za-z0-9_-]+$/),
  )
  .min(1)
  .max(MAX_MEDIA_SELECTION_ASSETS)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Duplicate media assets cannot be selected.",
  });

export function parseMediaAssetIds(input: unknown): string[] {
  return mediaAssetIdsSchema.parse(input);
}
