import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adminVehicleListQuerySchema,
  bulkVehicleLifecycleCommandSchema,
  createVehicleInputSchema,
  duplicateVehicleCommandSchema,
  publicVehicleListQuerySchema,
  vehicleLifecycleCommandSchema,
  vehicleSlugSchema,
  vehicleStatusSchema,
  vehicleVinLastSixSchema,
} from "./schemas.ts";

describe("vehicle contracts", () => {
  it("uses the approved lifecycle vocabulary", () => {
    assert.equal(vehicleStatusSchema.parse("available"), "available");
    assert.equal(vehicleStatusSchema.safeParse("published").success, false);
  });

  it("normalizes vehicle identifiers", () => {
    assert.equal(vehicleSlugSchema.parse(" Audi A6 Avant "), "audi-a6-avant");
    assert.equal(vehicleVinLastSixSchema.parse("ab12c3"), "AB12C3");
    assert.equal(vehicleVinLastSixSchema.safeParse("IOQ123").success, false);
  });

  it("parses allowlisted public filters and pagination", () => {
    assert.deepEqual(
      publicVehicleListQuerySchema.parse({
        bodyType: "wagon",
        featured: "true",
        page: "2",
        pageSize: "12",
        search: "  Audi   Avant ",
        sort: "price-desc",
      }),
      {
        bodyType: "wagon",
        featured: true,
        page: 2,
        pageSize: 12,
        search: "Audi Avant",
        sort: "price-desc",
      },
    );
    assert.equal(
      publicVehicleListQuerySchema.safeParse({ sort: "price;drop table" })
        .success,
      false,
    );
  });

  it("rejects inverted price bounds", () => {
    assert.equal(
      publicVehicleListQuerySchema.safeParse({
        maximumPriceCents: 1_000,
        minimumPriceCents: 2_000,
      }).success,
      false,
    );
  });

  it("allows only approved admin sort fields", () => {
    assert.equal(
      adminVehicleListQuerySchema.safeParse({ sortField: "password" }).success,
      false,
    );
  });

  it("normalizes complete vehicle writes into the canonical contract", () => {
    const input = createVehicleInputSchema.parse({
      bodyType: "wagon",
      co2Emission: 132,
      condition: "used",
      consumption: 5.6,
      description:
        "  A carefully maintained vehicle.\r\n\r\nReady for a new owner.  ",
      exteriorColor: "  Glacier   white ",
      features: [" Heated seats ", "Heated seats", "Camera"],
      firstRegistration: "2024-03",
      fuelType: "diesel",
      inspectionStatus: "passed",
      isFeatured: true,
      labels: [" Premium "],
      make: " Audi ",
      marginEstimateCents: 250_000,
      mileage: 24_500,
      model: " A6 ",
      ownerCount: 1,
      powerKw: 150,
      priceCents: 4_990_000,
      slug: " Audi A6 Avant ",
      status: "available",
      stockNumber: " ka-2700 ",
      transmissionType: "automatic",
      variant: "  Avant   quattro ",
      vinLastSix: "ab12c3",
    });

    assert.equal(input.stockNumber, "KA-2700");
    assert.equal(input.slug, "audi-a6-avant");
    assert.equal(input.description.includes("\r"), false);
    assert.deepEqual(input.features, ["Heated seats", "Camera"]);
    assert.equal(input.variant, "Avant quattro");
    assert.equal(input.vinLastSix, "AB12C3");
  });

  it("rejects invalid vehicle write bounds and legacy states", () => {
    const validInput = {
      bodyType: "wagon",
      co2Emission: null,
      condition: "used",
      consumption: null,
      description: "A complete description with enough useful detail.",
      exteriorColor: "Black",
      features: ["Camera"],
      firstRegistration: "2024-03",
      fuelType: "diesel",
      inspectionStatus: "passed",
      isFeatured: false,
      labels: [],
      make: "Audi",
      marginEstimateCents: null,
      mileage: 20_000,
      model: "A6",
      ownerCount: 1,
      powerKw: 150,
      priceCents: 4_000_000,
      slug: "audi-a6",
      status: "available",
      stockNumber: "KA-2700",
      transmissionType: "automatic",
      variant: "Avant",
      vinLastSix: "AB12C3",
    } as const;

    assert.equal(
      createVehicleInputSchema.safeParse({
        ...validInput,
        firstRegistration: "2024-13",
      }).success,
      false,
    );
    assert.equal(
      createVehicleInputSchema.safeParse({
        ...validInput,
        priceCents: 1.5,
      }).success,
      false,
    );
    assert.equal(
      createVehicleInputSchema.safeParse({
        ...validInput,
        status: "published",
      }).success,
      false,
    );
  });

  it("validates single, bulk, and duplicate command identifiers", () => {
    const id = "ck9h7d0x00000qzrmn831i7rn";

    assert.deepEqual(
      vehicleLifecycleCommandSchema.parse({ id, status: "sold" }),
      { id, status: "sold" },
    );
    assert.deepEqual(
      bulkVehicleLifecycleCommandSchema.parse({
        ids: [id, id],
        status: "archived",
      }),
      { ids: [id], status: "archived" },
    );
    assert.deepEqual(duplicateVehicleCommandSchema.parse({ id }), { id });
    assert.equal(
      vehicleLifecycleCommandSchema.safeParse({
        id: "vehicle-1",
        status: "sold",
      }).success,
      false,
    );
  });
});
