import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPublicVehicleListingHref,
  parsePublicVehicleListingSearchParams,
} from "./listing-search-params.ts";

describe("public vehicle listing search params", () => {
  it("maps the existing euro URL filter to the cents query contract", () => {
    assert.deepEqual(
      parsePublicVehicleListingSearchParams({
        bodyType: "wagon",
        maximumPrice: "50000",
        page: "2",
        sort: "price-desc",
      }),
      {
        bodyType: "wagon",
        maximumPriceCents: 5_000_000,
        page: 2,
        pageSize: 20,
        sort: "price-desc",
      },
    );
  });

  it("drops invalid and unsupported values without discarding valid filters", () => {
    assert.deepEqual(
      parsePublicVehicleListingSearchParams({
        bodyType: "convertible",
        location: "Wien",
        make: "  Audi  ",
        page: "not-a-page",
        sort: ["price-asc", "price-desc"],
      }),
      {
        make: "Audi",
        page: 1,
        pageSize: 20,
        sort: "featured",
      },
    );
  });

  it("removes an inverted lower price bound and retains the upper bound", () => {
    const query = parsePublicVehicleListingSearchParams({
      maximumPriceCents: "2000000",
      minimumPriceCents: "3000000",
    });

    assert.equal(query.minimumPriceCents, undefined);
    assert.equal(query.maximumPriceCents, 2_000_000);
  });

  it("serializes stable listing links and omits defaults", () => {
    const query = parsePublicVehicleListingSearchParams({
      fuelType: "electric",
      maximumPrice: "40000",
    });

    assert.equal(
      buildPublicVehicleListingHref(query, 3),
      "/fahrzeuge?fuelType=electric&maximumPrice=40000&page=3",
    );
  });
});
