import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ZodError } from "zod";

import {
  MAX_MEDIA_DOWNLOAD_ASSETS,
  parseMediaDownloadIds,
} from "./media-download-validation.ts";

describe("media download validation", () => {
  it("accepts unique opaque asset IDs within the archive limit", () => {
    const ids = Array.from(
      { length: MAX_MEDIA_DOWNLOAD_ASSETS },
      (_, index) => `asset_${index}`,
    );

    assert.deepEqual(parseMediaDownloadIds(ids), ids);
  });

  it("rejects empty, oversized, malformed, or duplicate selections", () => {
    for (const ids of [
      [],
      Array.from(
        { length: MAX_MEDIA_DOWNLOAD_ASSETS + 1 },
        (_, index) => `asset_${index}`,
      ),
      ["../private"],
      ["asset-1", "asset-1"],
    ]) {
      assert.throws(() => parseMediaDownloadIds(ids), ZodError);
    }
  });
});
