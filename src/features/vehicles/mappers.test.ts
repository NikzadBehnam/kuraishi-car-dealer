import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  toAdminVehicleDetailDto,
  toPublicVehicleDetailDto,
  toPublicVehicleSearchFacetsDto,
} from "./mappers.ts";

const baseVehicle = {
  id: "vehicle-1",
  slug: "audi-a6-avant",
  make: "Audi",
  model: "A6",
  variant: "Avant 50 TDI",
  priceCents: 5_490_000,
  firstRegistration: new Date("2024-05-01T00:00:00.000Z"),
  mileage: 24_500,
  fuelType: "diesel" as const,
  transmissionType: "automatic" as const,
  powerKw: 210,
  bodyType: "wagon" as const,
  exteriorColor: "Mythos black",
  condition: "used" as const,
  status: "available" as const,
  isFeatured: true,
  labels: ["Premium"],
};

describe("vehicle DTO mappers", () => {
  it("builds sorted public make/model facets with accurate counts", () => {
    assert.deepEqual(
      toPublicVehicleSearchFacetsDto([
        { make: "Volkswagen", model: "Golf", _count: { _all: 2 } },
        { make: "Audi", model: "Q5", _count: { _all: 1 } },
        { make: "Audi", model: "A6", _count: { _all: 3 } },
      ]),
      {
        total: 6,
        makes: [
          {
            value: "Audi",
            count: 4,
            models: [
              { value: "A6", count: 3 },
              { value: "Q5", count: 1 },
            ],
          },
          {
            value: "Volkswagen",
            count: 2,
            models: [{ value: "Golf", count: 2 }],
          },
        ],
      },
    );
  });

  it("maps a public vehicle to serializable values and ordered images", () => {
    const dto = toPublicVehicleDetailDto({
      ...baseVehicle,
      description: "A carefully maintained vehicle.",
      consumption: 6.2,
      co2Emission: 163,
      ownerCount: 2,
      features: ["Matrix LED"],
      images: [
        {
          id: "image-2",
          url: "https://example.test/2.jpg",
          altText: "Rear view",
          width: 1600,
          height: 900,
          position: 1,
        },
        {
          id: "image-1",
          url: "https://example.test/1.jpg",
          altText: null,
          width: 1600,
          height: 900,
          position: 0,
        },
      ],
    });

    assert.equal(dto.firstRegistration, "2024-05");
    assert.equal(dto.powerPs, 286);
    assert.equal(dto.ownerCount, 2);
    assert.equal(dto.coverImage?.id, "image-1");
    assert.equal(dto.coverImage?.altText, "Audi A6 Avant 50 TDI");
    assert.deepEqual(
      dto.images.map((image) => image.position),
      [0, 1],
    );
    assert.doesNotThrow(() => JSON.stringify(dto));
  });

  it("refuses to create a public DTO for a non-public state", () => {
    assert.throws(
      () =>
        toPublicVehicleDetailDto({
          ...baseVehicle,
          status: "draft",
          description: "Draft vehicle",
          consumption: null,
          co2Emission: null,
          ownerCount: 0,
          features: [],
          images: [],
        }),
      /not public/u,
    );
  });

  it("converts admin BigInt media sizes and dates for transport", () => {
    const dto = toAdminVehicleDetailDto({
      ...baseVehicle,
      stockNumber: "KC-001",
      inspectionStatus: "passed",
      updatedAt: new Date("2026-09-27T08:00:00.000Z"),
      _count: {
        leads: 2,
        favourites: 3,
        comparisonSelections: 1,
      },
      description: "Admin detail",
      marginEstimateCents: 500_000,
      consumption: 6.2,
      co2Emission: 163,
      features: ["Matrix LED"],
      vinLastSix: "AB12C3",
      ownerCount: 1,
      acquisitionDate: new Date("2026-08-12T00:00:00.000Z"),
      publishedAt: new Date("2026-09-01T10:00:00.000Z"),
      reservedAt: null,
      reservedUntil: null,
      soldAt: null,
      archivedAt: null,
      createdAt: new Date("2026-08-13T09:00:00.000Z"),
      updatedBy: {
        id: "user-1",
        name: "Admin User",
        email: "admin@example.test",
      },
      images: [
        {
          id: "image-1",
          url: "https://example.test/1.jpg",
          altText: null,
          width: 1600,
          height: 900,
          position: 0,
          provider: "development-seed",
          providerAssetId: "vehicle-1-0",
          originalFilename: "audi-a6.jpg",
          mimeType: "image/jpeg",
          sizeBytes: BigInt(1_234_567),
          title: "Audi A6",
          createdAt: new Date("2026-08-13T09:00:00.000Z"),
          updatedAt: new Date("2026-09-27T08:00:00.000Z"),
        },
      ],
    });

    assert.equal(dto.images[0]?.sizeBytes, "1234567");
    assert.equal(dto.acquisitionDate, "2026-08-12");
    assert.equal(dto.updatedAt, "2026-09-27T08:00:00.000Z");
    assert.doesNotThrow(() => JSON.stringify(dto));
  });
});
