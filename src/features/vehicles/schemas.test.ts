import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adminVehicleListQuerySchema,
  publicVehicleListQuerySchema,
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
});
