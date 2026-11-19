import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  AdminInspectionStatus,
  AdminVehicle,
  AdminVehicleStatus,
} from "../types/admin.ts";
import {
  getPublicVehicleVisibility,
  toPublicInventoryVehicle,
} from "./inventory-policy.ts";
import type { PublicVehicleVisibility } from "./inventory-policy.ts";

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

  const hidden: PublicVehicleVisibility = {
    catalog: false,
    detail: false,
    comparison: false,
    sitemap: false,
    featured: false,
    similar: false,
    inquiry: null,
  };
  const expected: Record<AdminVehicleStatus, PublicVehicleVisibility> = {
    draft: hidden,
    published: {
      catalog: true,
      detail: true,
      comparison: true,
      sitemap: true,
      featured: true,
      similar: true,
      inquiry: "standard",
    },
    reserved: {
      catalog: true,
      detail: true,
      comparison: true,
      sitemap: true,
      featured: false,
      similar: false,
      inquiry: "informational",
    },
    sold: {
      ...hidden,
      detail: true,
      sitemap: true,
    },
    archived: hidden,
  };
  const statuses: AdminVehicleStatus[] = [
    "draft",
    "published",
    "reserved",
    "sold",
    "archived",
  ];
  const inspections: AdminInspectionStatus[] = [
    "pending",
    "in_progress",
    "passed",
    "failed",
  ];

  for (const status of statuses) {
    for (const inspectionStatus of inspections) {
      it(`enforces every public surface for ${status}/${inspectionStatus}`, () => {
        for (const isFeatured of [true, false]) {
          const current = {
            ...vehicle,
            status,
            inspectionStatus,
            isFeatured,
            // Deliberately contradict lifecycle to verify output is derived.
            isAvailable: status !== "published",
          };
          const unavailableInspection =
            inspectionStatus !== "passed" &&
            (status === "published" || status === "reserved");
          const visibility = unavailableInspection
            ? hidden
            : {
                ...expected[status],
                featured: expected[status].featured && isFeatured,
              };
          assert.deepEqual(getPublicVehicleVisibility(current), visibility);

          const result = toPublicInventoryVehicle(current);
          if (!visibility.detail) {
            assert.equal(result, null);
          } else {
            assert.ok(result);
            assert.equal(result.status, status);
            assert.equal(result.isAvailable, status === "published");
            assert.equal(result.isFeatured, visibility.featured);
            assert.equal(
              result.hasPassedInspection,
              inspectionStatus === "passed",
            );
          }
        }
      });
    }
  }
});
