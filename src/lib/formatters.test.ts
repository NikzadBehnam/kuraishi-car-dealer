import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCurrency,
  formatMileage,
  formatRegistration,
} from "./formatters.ts";
describe("formatters", () => {
  it("formats German vehicle values", () => {
    assert.match(formatCurrency(29900), /29\.900/);
    assert.equal(formatMileage(45300), "45.300 km");
    assert.equal(formatRegistration("2023-05"), "05/2023");
  });
});
