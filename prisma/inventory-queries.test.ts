import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, beforeEach, describe, it, mock } from "node:test";

import { z } from "zod";

import { Prisma } from "../src/generated/prisma/client.ts";
import {
  assertAuthenticatedSession,
  AuthorizationError,
} from "../src/lib/auth-access.ts";
import type { AuthSession } from "../src/lib/auth-access.ts";
import { createInventoryTestDatabase } from "./inventory-test-client.ts";

const { prisma } = createInventoryTestDatabase();
const prefix = randomUUID();
const actorId = `query-user-${prefix}`;
const dealerId = `query-dealer-${prefix}`;
const ids = ["a", "b", "c", "d", "e", "f", "g", "h"].map(
  (suffix) => `${prefix}-${suffix}`,
);
const slug = (index: number) =>
  index === 7 ? `query-\u0161koda-${ids[index]}` : `query-${ids[index]}`;
let session: AuthSession | null = null;
let databaseFailure: Error | undefined;
const queryClient = prisma.$extends({
  query: {
    vehicle: {
      async $allOperations({ args, query }) {
        if (databaseFailure) {
          throw databaseFailure;
        }
        return query(args);
      },
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
        await tx.vehicle.deleteMany({ where: { id: { in: ids } } });
        await tx.dealer.deleteMany({ where: { id: dealerId } });
        await tx.user.deleteMany({ where: { id: actorId } });
      });
      assert.equal(
        await prisma.vehicle.count({ where: { id: { in: ids } } }),
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
      () => queries.listPublicVehicles({ page: 0 }),
      () => queries.listPublicVehicles({ pageSize: 101 }),
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
      await queries.getRelatedVehicles({ id: `missing-${prefix}` }),
      null,
    );
  });

  it("propagates database failures instead of returning demo or success-shaped data", async () => {
    const failure = new Error("Intentional query failure");
    databaseFailure = failure;
    try {
      await assert.rejects(
        () => queries.getFeaturedVehicles(),
        (error) => error === failure,
      );
    } finally {
      databaseFailure = undefined;
    }
  });
});
