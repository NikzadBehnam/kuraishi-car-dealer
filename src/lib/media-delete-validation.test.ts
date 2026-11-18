import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ZodError } from "zod";

import {
  mediaDeletionResponseSchema,
  parseMediaDeletionIds,
} from "./media-delete-validation.ts";

describe("media deletion validation", () => {
  it("accepts a strict request and validates per-asset outcomes", () => {
    assert.deepEqual(parseMediaDeletionIds({ ids: ["asset-1"] }), ["asset-1"]);
    assert.deepEqual(
      mediaDeletionResponseSchema.parse({
        results: [
          {
            id: "asset-1",
            filename: "image.png",
            status: "in_use",
            message: "Detach or replace the asset first.",
          },
        ],
      }).results[0]?.status,
      "in_use",
    );
  });

  it("rejects malformed, duplicate, or unexpected request fields", () => {
    for (const input of [
      { ids: [] },
      { ids: ["asset-1", "asset-1"] },
      { ids: ["../private"] },
      { ids: ["asset-1"], extra: true },
    ]) {
      assert.throws(() => parseMediaDeletionIds(input), ZodError);
    }
  });
});
