import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { firstRegistrationMonthSchema } from "./inventory-validation.ts";

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
