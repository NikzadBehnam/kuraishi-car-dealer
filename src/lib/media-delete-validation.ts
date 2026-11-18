import { z } from "zod";

import { mediaAssetIdsSchema } from "./media-selection-validation.ts";

export const mediaDeletionRequestSchema = z.strictObject({
  ids: mediaAssetIdsSchema,
});

export const mediaDeletionResponseSchema = z.strictObject({
  results: z.array(
    z.strictObject({
      id: z.string().min(1),
      filename: z.string(),
      status: z.enum(["deleted", "in_use", "not_found", "failed"]),
      message: z.string().min(1),
    }),
  ),
});

export type MediaDeletionResult = z.infer<
  typeof mediaDeletionResponseSchema
>["results"][number];

export function parseMediaDeletionIds(input: unknown): string[] {
  return mediaDeletionRequestSchema.parse(input).ids;
}
