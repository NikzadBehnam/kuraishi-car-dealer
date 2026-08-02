import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { vehicles } from "../data/vehicles.ts";
import { filterVehicles } from "./vehicle-filters.ts";
describe("filterVehicles", () => {
  it("filters and sorts without mutating source", () => {
    const result = filterVehicles(vehicles, {
      fuelType: "electric",
      sort: "price-asc",
    });
    assert.ok(result.every((vehicle) => vehicle.fuelType === "electric"));
    assert.ok(result[0].price <= result.at(-1)!.price);
    assert.equal(vehicles.length, 24);
  });
});
