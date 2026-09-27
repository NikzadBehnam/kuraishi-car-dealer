import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildVehicleDuplicateIdentifiers,
  buildVehiclePersistenceData,
  canTransitionVehicleStatus,
  resolveVehicleLifecycleDates,
} from "./mutation-policy.ts";
import { createVehicleInputSchema } from "./schemas.ts";

const now = new Date("2026-09-27T10:00:00.000Z");

describe("vehicle mutation policy", () => {
  it("maps the year-month contract to a stable UTC database date", () => {
    const input = createVehicleInputSchema.parse({
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
    });

    assert.equal(
      buildVehiclePersistenceData(input).firstRegistration.toISOString(),
      "2024-03-01T00:00:00.000Z",
    );
  });

  it("sets lifecycle timestamps when a vehicle becomes public", () => {
    assert.deepEqual(resolveVehicleLifecycleDates("available", null, now), {
      archivedAt: null,
      publishedAt: now,
      reservedAt: null,
      reservedUntil: null,
      soldAt: null,
    });
    assert.deepEqual(resolveVehicleLifecycleDates("reserved", null, now), {
      archivedAt: null,
      publishedAt: now,
      reservedAt: now,
      reservedUntil: null,
      soldAt: null,
    });
  });

  it("preserves history for terminal states and clears it for draft", () => {
    const publishedAt = new Date("2026-09-01T08:00:00.000Z");
    const reservedAt = new Date("2026-09-20T09:00:00.000Z");
    const current = {
      archivedAt: null,
      publishedAt,
      reservedAt,
      reservedUntil: null,
      soldAt: null,
    };

    assert.deepEqual(resolveVehicleLifecycleDates("sold", current, now), {
      archivedAt: null,
      publishedAt,
      reservedAt,
      reservedUntil: null,
      soldAt: now,
    });
    assert.deepEqual(resolveVehicleLifecycleDates("draft", current, now), {
      archivedAt: null,
      publishedAt: null,
      reservedAt: null,
      reservedUntil: null,
      soldAt: null,
    });
  });

  it("allows only approved lifecycle transitions", () => {
    assert.equal(canTransitionVehicleStatus("available", "sold"), true);
    assert.equal(canTransitionVehicleStatus("reserved", "available"), true);
    assert.equal(canTransitionVehicleStatus("archived", "draft"), true);
    assert.equal(canTransitionVehicleStatus("draft", "sold"), false);
    assert.equal(canTransitionVehicleStatus("sold", "reserved"), false);
  });

  it("builds bounded unique identifiers for draft duplicates", () => {
    assert.deepEqual(
      buildVehicleDuplicateIdentifiers(
        { slug: "audi-a6-avant", stockNumber: "KA-2700" },
        "a1b2c3d4",
      ),
      {
        slug: "audi-a6-avant-copy-a1b2c3d4",
        stockNumber: "KA-2700-COPY-A1B2C3D4",
      },
    );

    const identifiers = buildVehicleDuplicateIdentifiers(
      { slug: "s".repeat(120), stockNumber: "K".repeat(64) },
      "a1b2c3d4",
    );

    assert.equal(identifiers.slug.length <= 120, true);
    assert.equal(identifiers.stockNumber.length <= 64, true);
  });
});
