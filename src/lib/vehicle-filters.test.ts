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

  it("filters by the homepage make, model, and location criteria", () => {
    const result = filterVehicles(vehicles, {
      make: "Volkswagen",
      model: "Tiguan",
      location: "Düsseldorf",
    });

    assert.equal(result.length, 1);
    assert.equal(result[0].model, "Tiguan");
  });
});
