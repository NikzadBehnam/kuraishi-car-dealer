import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, it, mock } from "node:test";

import { z } from "zod";

import { vehicles } from "../src/data/vehicles.ts";
import {
  Prisma,
  VehicleInspectionStatus,
  VehicleStatus,
} from "../src/generated/prisma/client.ts";
import {
  assertAuthenticatedSession,
  AuthorizationError,
} from "../src/lib/auth-access.ts";
import type { AuthSession } from "../src/lib/auth-access.ts";
import {
  getPublicVehicleEligibilitySql,
  getPublicVehicleWhere,
} from "../src/lib/inventory-eligibility.ts";
import { getPublicVehicleVisibility } from "../src/lib/inventory-policy.ts";
import { filterVehicles } from "../src/lib/vehicle-filters.ts";
import { createInventoryTestDatabase } from "./inventory-test-client.ts";

const { prisma } = createInventoryTestDatabase();
const prefix = randomUUID();
const actorId = `query-user-${prefix}`;
const dealerId = `query-dealer-${prefix}`;
const ids = ["a", "b", "c", "d", "e", "f", "g", "h"].map(
  (suffix) => `${prefix}-${suffix}`,
);
const searchId = (id: string) => `search-${prefix}-${id.padStart(2, "0")}`;
const searchIds = vehicles.map(({ id }) => searchId(id));
const slug = (index: number) =>
  index === 7 ? `query-\u0161koda-${ids[index]}` : `query-${ids[index]}`;
let session: AuthSession | null = null;
let databaseFailure: Error | undefined;
const queryClient = prisma.$extends({
  query: {
    async $allOperations({ args, query }) {
      if (databaseFailure) {
        throw databaseFailure;
      }
      return query(args);
    },
  },
});
let queries: typeof import("../src/lib/inventory-queries.ts");
let dbMock: ReturnType<typeof mock.module> | undefined;
let sessionMock: ReturnType<typeof mock.module> | undefined;

describe("isolated inventory queries", { concurrency: false }, () => {
  before(async () => {
    assert.equal(
      await prisma.vehicle.count(),
      0,
      "Use an empty isolated test child; existing inventory will not be deleted.",
    );
    const timestamp = new Date("2026-01-01T10:00:00.000Z");
    const fixtures = [
      { status: "published", isFeatured: true, bodyType: "suv" },
      { status: "published", isFeatured: true, bodyType: "suv" },
      { status: "published", isFeatured: false, bodyType: "suv" },
      { status: "reserved", isFeatured: false, bodyType: "suv" },
      { status: "sold", isFeatured: false, bodyType: "suv" },
      { status: "draft", isFeatured: false, bodyType: "suv" },
      { status: "archived", isFeatured: false, bodyType: "suv" },
      { status: "published", isFeatured: false, bodyType: null },
    ] satisfies Pick<
      Prisma.VehicleCreateManyInput,
      "status" | "isFeatured" | "bodyType"
    >[];

    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: actorId,
          name: "Inventory query test",
          email: `${prefix}@example.invalid`,
          role: "user",
        },
      });
      await tx.dealer.create({
        data: { id: dealerId, name: "Query test dealership" },
      });
      await tx.vehicle.createMany({
        data: fixtures.map((fixture, index) => ({
          ...fixture,
          id: ids[index],
          slug: slug(index),
          stockNumber: `TEST-${ids[index].toUpperCase()}`,
          make: "Example",
          model: `Query ${index}`,
          dealerId,
          createdById: actorId,
          updatedById: actorId,
          acquisitionDate: new Date("2025-12-01T00:00:00.000Z"),
          price: new Prisma.Decimal("19999.99"),
          marginEstimate: new Prisma.Decimal("2500.10"),
          vinLastSix: "123456",
          ownerCount: 1,
          inspectionStatus: fixture.status === "sold" ? "failed" : "passed",
          publishedAt: fixture.status === "draft" ? null : timestamp,
          soldAt: fixture.status === "sold" ? timestamp : null,
          createdAt: timestamp,
          updatedAt: timestamp,
        })),
      });
    });

    dbMock = mock.module("../src/lib/db.ts", {
      namedExports: { prisma: queryClient },
    });
    sessionMock = mock.module("../src/lib/session.ts", {
      namedExports: {
        requireSession: async () => assertAuthenticatedSession(session),
      },
    });
    queries = await import("../src/lib/inventory-queries.ts");
  });

  beforeEach(() => {
    session = null;
    databaseFailure = undefined;
  });

  after(async () => {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.vehicle.deleteMany({
          where: { id: { in: [...ids, ...searchIds] } },
        });
        await tx.dealer.deleteMany({ where: { id: dealerId } });
        await tx.user.deleteMany({ where: { id: actorId } });
      });
      assert.equal(
        await prisma.vehicle.count({
          where: { id: { in: [...ids, ...searchIds] } },
        }),
        0,
      );
    } finally {
      dbMock?.restore();
      sessionMock?.restore();
      await prisma.$disconnect();
    }
  });

  it("enforces authentication on both staff queries and permits ordinary staff/admin", async () => {
    for (const operation of [
      () => queries.listStaffVehicles(),
      () => queries.getStaffVehicle(ids[5]),
    ]) {
      await assert.rejects(
        operation,
        (error: unknown) =>
          error instanceof AuthorizationError && error.status === 401,
      );
    }
    for (const role of ["user", "admin"]) {
      session = { user: { role } };
      const list = await queries.listStaffVehicles({ status: "draft" });
      assert.equal(list.total, 1);
      assert.deepEqual(
        list.items.map((row) => row.id),
        [ids[5]],
      );
      const detail = await queries.getStaffVehicle(ids[5]);
      assert.equal(detail?.stockNumber, `TEST-${ids[5].toUpperCase()}`);
      assert.equal(detail?.marginEstimate?.toFixed(2), "2500.10");
    }
  });

  it("paginates eligible stock before counting with stable featured-first ties", async () => {
    const pages = await Promise.all(
      [1, 2, 3].map((page) =>
        queries.listPublicVehicles({ page, pageSize: 2 }),
      ),
    );
    assert.deepEqual(
      pages.map((page) => page.items.map((row) => row.id)),
      [[ids[0], ids[1]], [ids[2], ids[3]], [ids[7]]],
    );
    for (const page of pages) {
      assert.equal(page.total, 5);
      assert.equal(page.totalPages, 3);
      assert.equal(page.pageSize, 2);
    }
    assert.deepEqual(
      await queries.listPublicVehicles({ search: " \t\n\u00a0 ", pageSize: 2 }),
      pages[0],
    );
    const beyond = await queries.listPublicVehicles({ page: 99, pageSize: 2 });
    assert.deepEqual(beyond.items, []);
    assert.equal(beyond.total, 5);
    session = { user: { role: "user" } };
    const staff = await queries.listStaffVehicles();
    assert.equal(staff.pageSize, 8);
    assert.equal(staff.total, 8);
    assert.deepEqual(
      staff.items.map((row) => row.id),
      ids,
    );
  });

  it("matches the existing German filter in SQL, before pagination and counts", async () => {
    const searchVehicles = vehicles.map((vehicle, index) =>
      index === vehicles.length - 1
        ? {
            ...vehicle,
            variant: `${vehicle.variant} 50%_Edition O'Neil STRA\u1e9eE`,
            location: "Mu\u0308nchen",
            features: [...vehicle.features, "Cafe\u0301"],
          }
        : vehicle,
    );
    const timestamp = new Date("2026-01-01T10:00:00.000Z");
    try {
      await prisma.vehicle.createMany({
        data: searchVehicles.map((vehicle) => ({
          id: searchId(vehicle.id),
          slug: `search-${searchId(vehicle.id)}`,
          stockNumber: searchId(vehicle.id).toUpperCase(),
          make: vehicle.make,
          model: vehicle.model,
          variant: vehicle.variant,
          bodyType: vehicle.bodyType,
          fuelType: vehicle.fuelType,
          transmissionType: vehicle.transmissionType,
          exteriorColor: vehicle.exteriorColor,
          location: vehicle.location,
          firstRegistration: vehicle.firstRegistration,
          features: vehicle.features,
          labels: vehicle.labels,
          description: vehicle.description,
          isFeatured: vehicle.isFeatured,
          status: "published",
          inspectionStatus: "passed",
          publishedAt: timestamp,
          updatedAt: timestamp,
          acquisitionDate: timestamp,
          dealerId,
          createdById: actorId,
          updatedById: actorId,
        })),
      });
      for (const search of [
        "  WIEN   tiguan volkswagen TDI ",
        "BMW Kombi Diesel Automatik CarPlay",
        "skoda octavia",
        "Benzin",
        "Elektro",
        "Manuell",
        "Limousine",
        "Kleinwagen",
        "Transporter",
        "Sportwagen",
        "wagon petrol automatic",
        "ruckfahrkamera sitzheizung",
        "2023-01 skoda",
        "alpinwei\u1e9e",
        "Top-Angebot",
        "Neu",
        "M\u00dcNCHEN CAF\u00c9",
        "stra\u00dfe",
        "strasse",
        "Rueckfahrkamera",
        "Tesla Diesel",
        "nonexistent-vehicle",
        "gepflegtes",
        "%",
        "_",
        "50%_edition",
        "O'Neil",
        "' OR TRUE --",
        "\\",
      ]) {
        const expected = filterVehicles(searchVehicles, search).map(({ id }) =>
          searchId(id),
        );
        const actual = await queries.listPublicVehicles({
          search,
          pageSize: 100,
        });
        assert.deepEqual(
          actual.items.map(({ id }) => id),
          expected,
          search,
        );
        assert.equal(actual.total, expected.length, search);
      }

      const expected = filterVehicles(searchVehicles, "Automatik").map(
        ({ id }) => searchId(id),
      );
      const pages = [];
      for (let page = 1; page <= Math.ceil(expected.length / 2) + 1; page++) {
        const actual = await queries.listPublicVehicles({
          search: "Automatik",
          page,
          pageSize: 2,
        });
        assert.equal(actual.total, expected.length);
        assert.equal(actual.totalPages, Math.ceil(expected.length / 2));
        pages.push(...actual.items.map(({ id }) => id));
      }
      assert.deepEqual(pages, expected);

      const visible = await queries.listPublicVehicles({ search: "Example" });
      assert.deepEqual(
        visible.items.map(({ id }) => id),
        [ids[0], ids[1], ids[2], ids[3], ids[7]],
      );
      for (const search of [
        "Query 4",
        "Query 5",
        "Query 6",
        prefix,
        "123456",
        "2500.10",
        "19999.99",
      ]) {
        const actual = await queries.listPublicVehicles({ search });
        assert.equal(actual.total, 0, search);
        assert.deepEqual(actual.items, [], search);
      }
    } finally {
      await prisma.vehicle.deleteMany({ where: { id: { in: searchIds } } });
    }
  });

  it("protects direct slugs and public projections while preserving reserved/sold semantics", async () => {
    assert.equal((await queries.getPublicVehicle(slug(7)))?.id, ids[7]);
    assert.equal(await queries.getPublicVehicle(slug(5)), null);
    assert.equal(await queries.getPublicVehicle(slug(6)), null);
    const publicRows = (await queries.listPublicVehicles()).items;
    const sold = await queries.getPublicVehicle(slug(4));
    assert.ok(sold);
    assert.equal(sold.status, "sold");
    assert.equal(sold.isAvailable, false);
    assert.equal(sold.hasPassedInspection, false);
    const reserved = publicRows.find((row) => row.id === ids[3]);
    assert.ok(reserved);
    assert.equal(reserved.isAvailable, false);
    assert.equal(reserved.isFeatured, false);
    for (const row of [...publicRows, sold]) {
      for (const privateField of [
        "stockNumber",
        "marginEstimate",
        "vinLastSix",
        "inspectionStatus",
        "acquisitionDate",
        "reservedUntil",
        "soldAt",
        "createdById",
        "updatedById",
        "version",
        "createdBy",
        "updatedBy",
        "changes",
      ]) {
        assert.equal(Object.hasOwn(row, privateField), false, privateField);
      }
    }
  });

  it("keeps ORM and raw-SQL eligibility aligned with every public policy surface", async () => {
    const stored = await prisma.vehicle.findMany({
      select: {
        id: true,
        status: true,
        inspectionStatus: true,
        isFeatured: true,
      },
      orderBy: { id: "asc" },
    });
    const states = Object.values(VehicleStatus).flatMap((status) =>
      Object.values(VehicleInspectionStatus).flatMap((inspectionStatus) =>
        [false, true].map((isFeatured) => ({
          id: `${status}-${inspectionStatus}-${isFeatured}`,
          status,
          inspectionStatus,
          isFeatured,
        })),
      ),
    );
    const values = Prisma.join(
      states.map(
        (state) => Prisma.sql`(
        ${state.id}::text, ${state.status}::text,
        ${state.inspectionStatus}::text, ${state.isFeatured}::boolean
      )`,
      ),
    );
    for (const surface of [
      "catalog",
      "detail",
      "comparison",
      "sitemap",
      "featured",
      "similar",
      "inquiry",
    ] as const) {
      const actual = await prisma.vehicle.findMany({
        where: getPublicVehicleWhere(surface),
        select: { id: true },
        orderBy: { id: "asc" },
      });
      assert.deepEqual(
        actual.map(({ id }) => id),
        stored
          .filter((row) => getPublicVehicleVisibility(row)[surface])
          .map(({ id }) => id),
        surface,
      );
      const hypothetical = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        WITH "Vehicle"("id", "status", "inspectionStatus", "isFeatured") AS (
          VALUES ${values}
        )
        SELECT "id" FROM "Vehicle"
        WHERE ${getPublicVehicleEligibilitySql(surface)} ORDER BY "id"
      `);
      assert.deepEqual(
        hypothetical.map(({ id }) => id),
        states
          .filter((state) => getPublicVehicleVisibility(state)[surface])
          .map(({ id }) => id)
          .toSorted(),
        surface,
      );
    }
  });

  it("protects guessed comparison IDs, metadata, inquiry context and sitemap pages", async () => {
    for (let index = 0; index < ids.length; index++) {
      const [comparison, metadata, inquiry] = await Promise.all([
        queries.getPublicComparisonVehicle(ids[index]),
        queries.getPublicVehicleMetadata(slug(index)),
        queries.getPublicVehicleForInquiry(slug(index)),
      ]);
      const inCatalog = [0, 1, 2, 3, 7].includes(index);
      const hasDetail = inCatalog || index === 4;
      assert.equal(comparison?.id ?? null, inCatalog ? ids[index] : null);
      assert.equal(metadata?.id ?? null, hasDetail ? ids[index] : null);
      assert.equal(inquiry?.id ?? null, inCatalog ? ids[index] : null);
      if (inquiry) {
        assert.equal(
          inquiry.inquiryType,
          index === 3 ? "informational" : "standard",
        );
      }
      if (comparison) {
        assert.equal(comparison.isAvailable, index !== 3);
      }
      for (const result of [comparison, metadata, inquiry]) {
        if (result) {
          for (const field of [
            "stockNumber",
            "marginEstimate",
            "vinLastSix",
            "inspectionStatus",
            "createdById",
            "updatedById",
            "version",
          ]) {
            assert.equal(Object.hasOwn(result, field), false, field);
          }
        }
      }
    }
    const pages = [];
    for (let page = 1; page <= 4; page++) {
      const result = await queries.listPublicVehicleSitemapEntries({
        page,
        pageSize: 2,
      });
      assert.equal(result.total, 6);
      assert.equal(result.totalPages, 3);
      pages.push(...result.items);
    }
    assert.deepEqual(
      pages.map(({ id }) => id),
      [ids[0], ids[1], ids[2], ids[3], ids[4], ids[7]],
    );
    for (const entry of pages) {
      assert.ok(entry.updatedAt instanceof Date);
      assert.equal(entry.updatedAt.toISOString(), "2026-01-01T10:00:00.000Z");
      assert.equal(entry.slug, slug(ids.indexOf(entry.id)));
      assert.deepEqual(Object.keys(entry).toSorted(), [
        "id",
        "slug",
        "updatedAt",
      ]);
    }
  });

  it("bounds featured/related queries and never recommends private/unavailable/source stock", async () => {
    assert.deepEqual(
      (await queries.getFeaturedVehicles()).map((row) => row.id),
      ids.slice(0, 2),
    );
    assert.deepEqual(
      (await queries.getFeaturedVehicles({ limit: 1 })).map((row) => row.id),
      [ids[0]],
    );
    assert.deepEqual(
      (await queries.getRelatedVehicles({ id: ids[0] }))?.map((row) => row.id),
      [ids[1], ids[2]],
    );
    assert.deepEqual(
      (await queries.getRelatedVehicles({ id: ids[4], limit: 1 }))?.map(
        (row) => row.id,
      ),
      [ids[0]],
    );
    assert.equal(await queries.getRelatedVehicles({ id: ids[5] }), null);
    assert.equal(await queries.getRelatedVehicles({ id: ids[6] }), null);
    assert.deepEqual(await queries.getRelatedVehicles({ id: ids[7] }), []);
  });

  it("distinguishes malformed input from well-formed not-found lookups", async () => {
    session = { user: { role: "user" } };
    const invalid = [
      () => queries.getStaffVehicle("../private"),
      () => queries.getPublicVehicle("../private"),
      () => queries.getPublicVehicle("car?private=true"),
      () => queries.getPublicVehicle(null),
      () => queries.getPublicComparisonVehicle("../private"),
      () => queries.getPublicVehicleMetadata("car?private=true"),
      () => queries.getPublicVehicleForInquiry(null),
      () => queries.listPublicVehicleSitemapEntries({ pageSize: 101 }),
      () => queries.listPublicVehicles({ page: 0 }),
      () => queries.listPublicVehicles({ pageSize: 101 }),
      () => queries.listPublicVehicles({ search: null }),
      () => queries.listPublicVehicles({ search: ["BMW"] }),
      () => queries.listStaffVehicles({ status: "unknown" }),
      () =>
        queries.listStaffVehicles({ customerEmail: "not-an-allowed-filter" }),
      () => queries.getFeaturedVehicles({ limit: 101 }),
      () => queries.getRelatedVehicles({ id: ids[0], limit: 0 }),
    ];
    for (const operation of invalid) {
      await assert.rejects(operation, z.ZodError);
    }
    assert.equal(await queries.getStaffVehicle(`missing-${prefix}`), null);
    assert.equal(await queries.getPublicVehicle(`missing-${prefix}`), null);
    assert.equal(
      await queries.getPublicComparisonVehicle(`missing-${prefix}`),
      null,
    );
    assert.equal(
      await queries.getPublicVehicleMetadata(`missing-${prefix}`),
      null,
    );
    assert.equal(
      await queries.getPublicVehicleForInquiry(`missing-${prefix}`),
      null,
    );
    assert.equal(
      await queries.getRelatedVehicles({ id: `missing-${prefix}` }),
      null,
    );
  });

  it("propagates database failures instead of returning demo or success-shaped data", async () => {
    const failure = new Error("Intentional query failure");
    databaseFailure = failure;
    try {
      for (const operation of [
        () => queries.getFeaturedVehicles(),
        () => queries.listPublicVehicles({ search: "Example" }),
        () => queries.getPublicComparisonVehicle(ids[0]),
        () => queries.getPublicVehicleMetadata(slug(0)),
        () => queries.getPublicVehicleForInquiry(slug(0)),
        () => queries.listPublicVehicleSitemapEntries(),
      ]) {
        await assert.rejects(operation, (error) => error === failure);
      }
    } finally {
      databaseFailure = undefined;
    }
  });
});
