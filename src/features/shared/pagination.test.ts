import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createPaginatedResult } from "./pagination.ts";

describe("createPaginatedResult", () => {
  it("derives stable page metadata", () => {
    assert.deepEqual(createPaginatedResult(["vehicle"], 2, 10, 21), {
      items: ["vehicle"],
      page: 2,
      pageSize: 10,
      total: 21,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("handles an empty result", () => {
    assert.deepEqual(createPaginatedResult([], 1, 20, 0), {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });
});
