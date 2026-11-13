import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { vehicles } from "../data/vehicles.ts";
import { filterVehicles } from "./vehicle-filters.ts";
describe("filterVehicles", () => {
  it("matches multiple terms across make, model, variant and location", () => {
    const result = filterVehicles(vehicles, "  WIEN   tiguan volkswagen TDI ");

    assert.deepEqual(result.map((vehicle) => vehicle.id), ["1"]);
  });

  it("matches German vehicle labels and equipment", () => {
    const result = filterVehicles(vehicles, "BMW Kombi Diesel Automatik CarPlay");

    assert.ok(result.length > 0);
    assert.ok(
      result.every(
        (vehicle) =>
          vehicle.make === "BMW" &&
          vehicle.bodyType === "wagon" &&
          vehicle.fuelType === "diesel" &&
          vehicle.transmissionType === "automatic" &&
          vehicle.features.includes("Apple CarPlay"),
      ),
    );
    assert.ok(
      filterVehicles(vehicles, "Benzin").every(
        (vehicle) => vehicle.fuelType === "petrol",
      ),
    );
  });

  it("matches accented names without requiring accents", () => {
    const result = filterVehicles(vehicles, "skoda octavia");
    assert.equal(result.length, 1);
    assert.equal(result[0].make, "Škoda");
  });

  it("returns no results when any search term does not match", () => {
    assert.deepEqual(filterVehicles(vehicles, "Tesla Diesel"), []);
    assert.deepEqual(filterVehicles(vehicles, "nonexistent-vehicle"), []);
  });

  it("shows all vehicles for a blank search, featured first, without mutation", () => {
    const input = vehicles.toReversed();
    const originalOrder = input.map((vehicle) => vehicle.id);
    const result = filterVehicles(input, " \t ");

    assert.equal(result.length, input.length);
    assert.ok(result.slice(0, 6).every((vehicle) => vehicle.isFeatured));
    assert.ok(result.slice(6).every((vehicle) => !vehicle.isFeatured));
    assert.deepEqual(input.map((vehicle) => vehicle.id), originalOrder);
    assert.deepEqual(
      filterVehicles(input, "").map((vehicle) => vehicle.id),
      result.map((vehicle) => vehicle.id),
    );
  });
});
