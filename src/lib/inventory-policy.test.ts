import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AdminVehicle } from "../types/admin.ts";
import {
  getPublicVehicleVisibility,
  toPublicInventoryVehicle,
} from "./inventory-policy.ts";

const vehicle: AdminVehicle = {
  id: "vehicle-1",
  slug: "example-vehicle",
  make: "Example",
  model: "Vehicle",
  variant: "Edition",
  price: 25000,
  firstRegistration: "2024-01",
  mileage: 10000,
  fuelType: "petrol",
  transmissionType: "automatic",
  powerKw: 100,
  powerPs: 136,
  bodyType: "sedan",
  exteriorColor: "Black",
  condition: "used",
  features: ["Navigation"],
  description: "A vehicle used for policy verification.",
  images: ["https://example.com/vehicle.webp"],
  dealerId: "dealer-1",
  location: "Wien",
  isFeatured: true,
  isAvailable: true,
  labels: ["Example"],
  stockNumber: "KA-1",
  status: "published",
  inspectionStatus: "passed",
  acquisitionDate: "2026-11-01",
  publishedAt: "2026-11-02T10:00:00.000Z",
  lastUpdatedAt: "2026-11-02T10:00:00.000Z",
  vinLastSix: "123456",
  ownerCount: 1,
  views: 10,
  inquiries: 2,
  marginEstimate: 2000,
};

describe("public inventory boundary", () => {
  it("uses an allowlist that excludes existing and future private fields", () => {
    const publicVehicle = toPublicInventoryVehicle({
      ...vehicle,
      ...{ internalNotes: "Private", customerEmail: "private@example.com" },
    });

    assert.ok(publicVehicle);
    for (const field of [
      "stockNumber",
      "marginEstimate",
      "vinLastSix",
      "inspectionStatus",
      "acquisitionDate",
      "views",
      "inquiries",
      "internalNotes",
      "customerEmail",
    ]) {
      assert.equal(Object.hasOwn(publicVehicle, field), false, field);
    }
    assert.equal(publicVehicle.ownerCount, 1);
    assert.equal(publicVehicle.hasPassedInspection, true);
    assert.notEqual(publicVehicle.images, vehicle.images);
  });

  it("hides private or inconsistent public records rather than trusting flags", () => {
    assert.equal(
      toPublicInventoryVehicle({ ...vehicle, status: "draft" }),
      null,
    );
    assert.equal(
      toPublicInventoryVehicle({ ...vehicle, inspectionStatus: "failed" }),
      null,
    );
    assert.equal(
      getPublicVehicleVisibility({ ...vehicle, status: "archived" }).featured,
      false,
    );
  });

  it("retains sold detail data without availability, promotion or inquiries", () => {
    const sold = { ...vehicle, status: "sold" } satisfies AdminVehicle;
    const visibility = getPublicVehicleVisibility(sold);
    const publicVehicle = toPublicInventoryVehicle(sold);

    assert.equal(visibility.detail, true);
    assert.equal(visibility.sitemap, true);
    assert.equal(visibility.catalog, false);
    assert.equal(visibility.inquiry, null);
    assert.ok(publicVehicle);
    assert.equal(publicVehicle.isAvailable, false);
    assert.equal(publicVehicle.isFeatured, false);
  });
});
