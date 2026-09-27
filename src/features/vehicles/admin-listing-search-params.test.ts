import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdminVehicleListingHref,
  parseAdminVehicleListingSearchParams,
} from "./admin-listing-search-params.ts";

describe("admin vehicle listing search params", () => {
  it("parses the allowlisted inventory controls", () => {
    assert.deepEqual(
      parseAdminVehicleListingSearchParams({
        page: "2",
        search: " KA-2600 ",
        sortDirection: "asc",
        sortField: "stockNumber",
        status: "available",
      }),
      {
        page: 2,
        pageSize: 8,
        search: "KA-2600",
        sortDirection: "asc",
        sortField: "stockNumber",
        status: "available",
      },
    );
  });

  it("drops invalid values while preserving valid filters", () => {
    assert.deepEqual(
      parseAdminVehicleListingSearchParams({
        page: "invalid",
        pageSize: "1000",
        search: "Audi",
        sortField: "marginEstimateCents",
        status: ["draft", "sold"],
      }),
      {
        page: 1,
        pageSize: 8,
        search: "Audi",
        sortDirection: "desc",
        sortField: "updatedAt",
      },
    );
  });

  it("builds stable pagination links without default noise", () => {
    const query = parseAdminVehicleListingSearchParams({
      sortDirection: "asc",
      sortField: "priceCents",
      status: "reserved",
    });

    assert.equal(
      buildAdminVehicleListingHref(query, 3),
      "/admin/vehicles?status=reserved&sortField=priceCents&sortDirection=asc&page=3",
    );
  });
});
