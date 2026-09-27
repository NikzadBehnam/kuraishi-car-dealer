import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdminLeadListingHref,
  parseAdminLeadListingSearchParams,
} from "./admin-listing-search-params.ts";

describe("admin lead listing search params", () => {
  it("parses allowlisted inbox controls", () => {
    assert.deepEqual(
      parseAdminLeadListingSearchParams({
        page: "2",
        search: " Customer ",
        source: "valuation",
        status: "new",
      }),
      {
        page: 2,
        pageSize: 10,
        search: "Customer",
        sortDirection: "desc",
        sortField: "createdAt",
        source: "valuation",
        status: "new",
      },
    );
  });

  it("drops invalid fields without discarding valid filters", () => {
    assert.deepEqual(
      parseAdminLeadListingSearchParams({
        page: "invalid",
        pageSize: "1000",
        priority: "high",
        status: ["new", "closed"],
      }),
      {
        page: 1,
        pageSize: 10,
        priority: "high",
        sortDirection: "desc",
        sortField: "createdAt",
      },
    );
  });

  it("builds stable pagination links", () => {
    const query = parseAdminLeadListingSearchParams({
      search: "BMW",
      status: "qualified",
    });

    assert.equal(
      buildAdminLeadListingHref(query, 3),
      "/admin/leads?search=BMW&status=qualified&page=3",
    );
  });
});
