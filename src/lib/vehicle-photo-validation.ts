import { z } from "zod";
import { inventoryIdSchema } from "./inventory-validation.ts";

export const MAX_VEHICLE_PHOTOS = 20;
export const MAX_PHOTOS_PER_UPLOAD = 5;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png"] as const;

export const photoIdsSchema = z
  .array(inventoryIdSchema)
  .max(MAX_VEHICLE_PHOTOS)
  .refine(
    (ids) => new Set(ids).size === ids.length,
    "Photo IDs must be unique.",
  );

export const photoUploadRequestSchema = z.strictObject({
  vehicleId: inventoryIdSchema.optional(),
  files: z
    .array(
      z.strictObject({
        contentType: z.enum(PHOTO_MIME_TYPES),
        sizeBytes: z.number().int().positive().max(MAX_PHOTO_BYTES),
      }),
    )
    .min(1)
    .max(MAX_PHOTOS_PER_UPLOAD),
});

export const photoUploadIdSchema = z.strictObject({ uploadId: z.uuid() });

export function detectPhotoMimeType(bytes: Uint8Array) {
  if ([0xff, 0xd8, 0xff].every((value, index) => bytes[index] === value)) {
    return "image/jpeg";
  }
  if (
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every(
      (value, index) => bytes[index] === value,
    )
  ) {
    return "image/png";
  }
  return null;
}

export function staffPhotoUrl(id: string) {
  return `/api/admin/vehicles/photos/${encodeURIComponent(id)}`;
}

export function publicPhotoUrl(id: string) {
  return `/api/vehicle-photos/${encodeURIComponent(id)}`;
}
