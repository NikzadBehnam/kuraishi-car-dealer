import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdminVehicleOrderBy,
  buildAdminVehicleWhere,
  buildPublicVehicleOrderBy,
  buildPublicVehicleVisibilityWhere,
  buildPublicVehicleWhere,
} from "./query-policy.ts";
import {
  adminVehicleListQuerySchema,
  publicVehicleListQuerySchema,
} from "./schemas.ts";

describe("vehicle query policy", () => {
  it("defines one public visibility predicate for listing and facets", () => {
    assert.deepEqual(buildPublicVehicleVisibilityWhere(), {
      status: { in: ["available", "reserved"] },
    });
  });

  it("always limits public inventory to public lifecycle states", () => {
    const where = buildPublicVehicleWhere(
      publicVehicleListQuerySchema.parse({
        bodyType: "wagon",
        maximumPriceCents: "5000000",
        search: "Audi",
      }),
    );

    assert.deepEqual(where, {
      status: { in: ["available", "reserved"] },
      bodyType: "wagon",
      priceCents: { lte: 5_000_000 },
      OR: [
        { make: { contains: "Audi", mode: "insensitive" } },
        { model: { contains: "Audi", mode: "insensitive" } },
        { variant: { contains: "Audi", mode: "insensitive" } },
      ],
    });
  });

  it("uses deterministic public sorting", () => {
    assert.deepEqual(buildPublicVehicleOrderBy("featured"), [
      { isFeatured: "desc" },
      { publishedAt: "desc" },
      { id: "asc" },
    ]);
    assert.deepEqual(buildPublicVehicleOrderBy("price-asc"), [
      { priceCents: "asc" },
      { id: "asc" },
    ]);
  });

  it("allows admin lifecycle filters and searchable identifiers", () => {
    const query = adminVehicleListQuerySchema.parse({
      inspectionStatus: "failed",
      search: "KC-001",
      sortDirection: "asc",
      sortField: "stockNumber",
      status: "draft",
    });

    assert.deepEqual(buildAdminVehicleWhere(query), {
      status: "draft",
      inspectionStatus: "failed",
      OR: [
        { stockNumber: { contains: "KC-001", mode: "insensitive" } },
        { make: { contains: "KC-001", mode: "insensitive" } },
        { model: { contains: "KC-001", mode: "insensitive" } },
        { variant: { contains: "KC-001", mode: "insensitive" } },
        { vinLastSix: { contains: "KC-001", mode: "insensitive" } },
      ],
    });
    assert.deepEqual(buildAdminVehicleOrderBy(query), [
      { stockNumber: "asc" },
      { id: "asc" },
    ]);
  });
});
