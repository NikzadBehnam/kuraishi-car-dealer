import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ZodError } from "zod";

import {
  MAX_MEDIA_SELECTION_ASSETS,
  parseMediaAssetIds,
} from "./media-selection-validation.ts";

describe("media selection validation", () => {
  it("accepts unique opaque asset IDs within the selection limit", () => {
    const ids = Array.from(
      { length: MAX_MEDIA_SELECTION_ASSETS },
      (_, index) => `asset_${index}`,
    );

    assert.deepEqual(parseMediaAssetIds(ids), ids);
  });

  it("rejects empty, oversized, malformed, or duplicate selections", () => {
    for (const ids of [
      [],
      Array.from(
        { length: MAX_MEDIA_SELECTION_ASSETS + 1 },
        (_, index) => `asset_${index}`,
      ),
      ["../private"],
      ["asset-1", "asset-1"],
    ]) {
      assert.throws(() => parseMediaAssetIds(ids), ZodError);
    }
  });
});
