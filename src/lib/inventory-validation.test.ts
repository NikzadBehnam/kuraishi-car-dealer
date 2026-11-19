import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  firstRegistrationMonthSchema,
  publicCatalogSearchParamsSchema,
} from "./inventory-validation.ts";

function currentMonthInVienna() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find(({ type }) => type === "year")?.value;
  const month = parts.find(({ type }) => type === "month")?.value;
  assert.ok(year && month);
  return `${year}-${month}`;
}

describe("first registration validation", () => {
  it("accepts the earliest valid month and the current dealership month", () => {
    assert.equal(
      firstRegistrationMonthSchema.safeParse("1886-01").success,
      true,
    );
    assert.equal(
      firstRegistrationMonthSchema.safeParse(currentMonthInVienna()).success,
      true,
    );
  });

  it("rejects malformed, pre-automobile, and future months", () => {
    for (const month of [
      "0000-01",
      "1885-12",
      "2024-00",
      "2024-13",
      "9999-12",
    ]) {
      assert.equal(
        firstRegistrationMonthSchema.safeParse(month).success,
        false,
      );
    }
  });
});

describe("public catalog URL parameters", () => {
  it("defaults to the first page and trims bounded search terms", () => {
    assert.deepEqual(publicCatalogSearchParamsSchema.parse({}), {
      q: "",
      page: 1,
    });
    assert.deepEqual(
      publicCatalogSearchParamsSchema.parse({ q: "  BMW X5  ", page: "2" }),
      { q: "BMW X5", page: 2 },
    );
  });

  it("rejects repeated, oversized, malformed, and unsafe URL values", () => {
    for (const input of [
      { q: ["BMW"] },
      { q: "x".repeat(101) },
      { page: ["2"] },
      { page: "0" },
      { page: "1.5" },
      { page: "999999999999999999999" },
    ]) {
      assert.equal(
        publicCatalogSearchParamsSchema.safeParse(input).success,
        false,
      );
    }
  });
});
