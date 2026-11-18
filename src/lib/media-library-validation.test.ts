import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ZodError } from "zod";

import { parseMediaLibraryQuery } from "./media-library-validation.ts";

describe("media library query validation", () => {
  it("uses a bounded default page and preserves the existing filters", () => {
    assert.deepEqual(parseMediaLibraryQuery({}), {
      page: 1,
      pageSize: 24,
      search: "",
      type: "all",
      usage: "all",
      skip: 0,
      take: 24,
    });
    assert.deepEqual(
      parseMediaLibraryQuery({
        page: "3",
        pageSize: "100",
        search: "  sedan  ",
        type: "image",
        usage: "vehicle",
      }),
      {
        page: 3,
        pageSize: 100,
        search: "sedan",
        type: "image",
        usage: "vehicle",
        skip: 200,
        take: 100,
      },
    );
  });

  it("rejects invalid filters, unbounded sizes, and unsafe offsets", () => {
    for (const input of [
      { type: "video" },
      { usage: "archived" },
      { pageSize: "101" },
      { page: "not-a-number" },
      { page: "2147483649", pageSize: "1" },
      { search: "x".repeat(201) },
      { extra: "unexpected" },
    ]) {
      assert.throws(() => parseMediaLibraryQuery(input), ZodError);
    }
  });
});
