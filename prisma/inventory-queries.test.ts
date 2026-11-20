import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
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
import { serializePublicVehicle } from "../src/lib/inventory-dto.ts";
import {
  getPublicVehicleEligibilitySql,
  getPublicVehicleWhere,
} from "../src/lib/inventory-eligibility.ts";
import { getPublicVehicleVisibility } from "../src/lib/inventory-policy.ts";
import { getTrustedOrigins } from "../src/lib/trusted-origins.ts";
import { filterVehicles } from "../src/lib/vehicle-filters.ts";
import {
  importInventoryFixtures,
  inventoryFixtures,
} from "./inventory-fixtures.ts";
import { createInventoryTestDatabase } from "./inventory-test-client.ts";
import { inquiryPrivacyNotice } from "../src/content/de/inquiry-privacy.ts";
import { dealershipDate } from "../src/lib/business-date.ts";
import {
  InquiryIntakeError,
  inquiryAppointmentTypes,
  type InquirySubmission,
} from "../src/lib/inquiry-validation.ts";

const { prisma } = createInventoryTestDatabase();
const prefix = randomUUID();
const actorId = `query-user-${prefix}`;
const dealerId = `query-dealer-${prefix}`;
const ids = ["a", "b", "c", "d", "e", "f", "g", "h"].map(
  (suffix) => `${prefix}-${suffix}`,
);
const searchId = (id: string) => `search-${prefix}-${id.padStart(2, "0")}`;
const searchIds = vehicles.map(({ id }) => searchId(id));
const serializationIds = ["public", "draft"].map(
  (kind) => `dto-${kind}-${prefix}`,
);
const fixtureIds = inventoryFixtures.map(({ id }) => id);
const fixtureConflictId = `fixture-conflict-${prefix}`;
const fixtureInput = { actorId, dealerId, acquiredOn: "2026-11-17" };
const importedTestRows = {
  id: { in: [...fixtureIds, fixtureConflictId] },
  createdById: actorId,
  dealerId,
};
const slug = (index: number) =>
  index === 7 ? `query-\u0161koda-${ids[index]}` : `query-${ids[index]}`;
type InventoryTestSession = AuthSession & {
  user: AuthSession["user"] & { id?: string };
};
let session: InventoryTestSession | null = null;
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
let dealershipSettings: typeof import("../src/lib/dealership-settings.ts");
let inquiryIntake: typeof import("../src/lib/inquiry-intake.ts");
let adminInquiryQueries: typeof import("../src/lib/admin-inquiry-queries.ts");
let adminInquiryNotes: typeof import("../src/lib/admin-inquiry-notes.ts");
let adminDashboardQueries: typeof import("../src/lib/admin-dashboard-queries.ts");
let adminVehicleRoutes: typeof import("../src/app/api/admin/vehicles/route.ts");
const inquiryKeys: string[] = [];
const inquiryClients: string[] = [];
let dbMock: ReturnType<typeof mock.module> | undefined;
let sessionMock: ReturnType<typeof mock.module> | undefined;
let cacheMock: ReturnType<typeof mock.module> | undefined;
let revalidatedPath: string | undefined;

async function deleteImportedTestRows(tx: Prisma.TransactionClient) {
  await tx.vehicleChange.deleteMany({ where: { vehicle: importedTestRows } });
  await tx.vehicle.deleteMany({ where: importedTestRows });
}

function runFixtureCommand(
  apply = false,
  env: NodeJS.ProcessEnv = process.env,
) {
  const result = spawnSync(
    process.execPath,
    [
      "--env-file=.env.inventory-test.local",
      "--experimental-strip-types",
      "prisma\\seed-inventory.ts",
      "--actor-id",
      actorId,
      "--dealer-id",
      dealerId,
      "--acquired-on",
      fixtureInput.acquiredOn,
      ...(apply ? ["--apply"] : []),
    ],
    { encoding: "utf8", env },
  );
  if (result.error) {
    throw result.error;
  }
  return result;
}

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
        AuthorizationError,
        requireSession: async () => assertAuthenticatedSession(session),
      },
    });
    cacheMock = mock.module("next/cache", {
      namedExports: {
        revalidatePath: (path: string, type?: string) => {
          revalidatedPath = type ? `${path}:${type}` : path;
        },
      },
    });
    queries = await import("../src/lib/inventory-queries.ts");
    dealershipSettings = await import("../src/lib/dealership-settings.ts");
    inquiryIntake = await import("../src/lib/inquiry-intake.ts");
    adminInquiryQueries = await import("../src/lib/admin-inquiry-queries.ts");
    adminInquiryNotes = await import("../src/lib/admin-inquiry-notes.ts");
    adminDashboardQueries =
      await import("../src/lib/admin-dashboard-queries.ts");
    adminVehicleRoutes = await import("../src/app/api/admin/vehicles/route.ts");
  });

  beforeEach(() => {
    session = null;
    databaseFailure = undefined;
    revalidatedPath = undefined;
  });

  after(async () => {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.inquiry.deleteMany({
          where: { submissionKey: { in: inquiryKeys } },
        });
        await tx.inquiryRateLimit.deleteMany({
          where: { key: { in: inquiryClients } },
        });
        await deleteImportedTestRows(tx);
        await tx.vehicle.deleteMany({
          where: { id: { in: [...ids, ...searchIds, ...serializationIds] } },
        });
        await tx.dealer.deleteMany({ where: { id: dealerId } });
        await tx.user.deleteMany({ where: { id: actorId } });
      });
      assert.equal(
        await prisma.vehicle.count({
          where: {
            id: {
              in: [
                ...ids,
                ...searchIds,
                ...serializationIds,
                ...fixtureIds,
                fixtureConflictId,
              ],
            },
          },
        }),
        0,
      );
    } finally {
      dbMock?.restore();
      sessionMock?.restore();
      cacheMock?.restore();
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
      assert.equal(detail?.marginEstimate, "2500.10");
    }
  });

  it("protects the real vehicle route and persists a staff draft", async () => {
    const input = {
      stockNumber: `ROUTE-${prefix.slice(0, 8).toUpperCase()}`,
      slug: `route-${prefix}`,
      make: "Example",
      model: "Route integration",
      mediaAssetIds: [],
    };
    const untrustedOrigin = await adminVehicleRoutes.POST(
      new Request("http://localhost:3000/api/admin/vehicles", {
        method: "POST",
        headers: {
          origin: "https://attacker.example",
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      }),
    );
    assert.equal(untrustedOrigin.status, 403);

    const anonymous = await adminVehicleRoutes.POST(
      new Request("http://localhost:3000/api/admin/vehicles", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      }),
    );
    assert.equal(anonymous.status, 401);

    session = { user: { role: "user", id: actorId } };
    const response = await adminVehicleRoutes.POST(
      new Request("http://localhost:3000/api/admin/vehicles", {
        method: "POST",
        headers: {
          origin: "http://localhost:3000",
          "content-type": "application/json",
        },
        body: JSON.stringify(input),
      }),
    );
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("cache-control"), "no-store");

    const result = await response.json();
    assert.equal(typeof result.vehicleId, "string");
    assert.equal(result.version, 1);
    assert.equal(revalidatedPath, "/:layout");

    try {
      const saved = await prisma.vehicle.findUniqueOrThrow({
        where: { id: result.vehicleId },
        select: {
          stockNumber: true,
          slug: true,
          status: true,
          createdById: true,
          updatedById: true,
        },
      });
      assert.deepEqual(saved, {
        stockNumber: input.stockNumber,
        slug: input.slug,
        status: "draft",
        createdById: actorId,
        updatedById: actorId,
      });

      const staffView = await queries.getStaffVehicle(result.vehicleId);
      assert.equal(staffView?.status, "draft");
      assert.equal(staffView?.slug, input.slug);
    } finally {
      await prisma.$transaction(async (tx) => {
        await tx.vehicleChange.deleteMany({
          where: { vehicleId: result.vehicleId },
        });
        await tx.vehicle.deleteMany({ where: { id: result.vehicleId } });
      });
    }
  });

  it("allows staff to preview saved drafts while public detail remains unavailable", async () => {
    session = { user: { role: "user" } };
    const draft = await queries.getStaffVehicle(ids[5]);

    assert.ok(draft);
    assert.equal(draft.status, "draft");
    assert.equal(await queries.getPublicVehicle(draft.slug), null);
    assert.equal(
      (await queries.listPublicVehicles({ search: draft.make })).items.some(
        (vehicle) => vehicle.id === draft.id,
      ),
      false,
    );
  });

  it("paginates staff inventory with fresh counts and clamps stale page requests", async () => {
    session = { user: { role: "user" } };
    const newId = `page-${prefix}`;
    const originals = await prisma.vehicle.findMany({
      where: { id: { in: ids } },
      select: { id: true, status: true, updatedAt: true },
    });

    try {
      await prisma.vehicle.update({
        where: { id: ids[1] },
        data: { updatedAt: new Date("2027-01-01T00:00:00.000Z") },
      });
      const firstPage = await queries.listStaffVehicles();
      assert.equal(firstPage.page, 1);
      assert.equal(firstPage.pageSize, 8);
      assert.equal(firstPage.total, 8);
      assert.equal(firstPage.totalPages, 1);
      assert.deepEqual(
        firstPage.items.map(({ id }) => id),
        [ids[1], ids[0], ...ids.slice(2)],
        "the default ordering remains updated-descending with ID tie-breakers",
      );

      const secondOfThree = await queries.listStaffVehicles({
        page: 2,
        pageSize: 3,
      });
      assert.equal(secondOfThree.total, 8);
      assert.equal(secondOfThree.page, 2);
      assert.equal(secondOfThree.totalPages, 3);
      assert.equal(secondOfThree.items.length, 3);

      await prisma.vehicle.update({
        where: { id: ids[5] },
        data: { status: "archived" },
      });
      assert.equal(
        (await queries.listStaffVehicles({ status: "draft" })).total,
        0,
      );
      assert.equal(
        (await queries.listStaffVehicles({ status: "archived" })).total,
        2,
      );

      await prisma.vehicle.create({
        data: {
          id: newId,
          slug: newId,
          stockNumber: `PAGE-${prefix.toUpperCase()}`,
          make: "Pagination",
          model: "Boundary",
          dealerId,
          createdById: actorId,
          updatedById: actorId,
          acquisitionDate: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2020-01-01T00:00:00.000Z"),
        },
      });
      const createdPage = await queries.listStaffVehicles({ page: 2 });
      assert.equal(createdPage.total, 9);
      assert.equal(createdPage.page, 2);
      assert.equal(createdPage.totalPages, 2);
      assert.deepEqual(
        createdPage.items.map(({ id }) => id),
        [newId],
      );

      await prisma.vehicle.delete({ where: { id: newId } });
      const stalePage = await queries.listStaffVehicles({ page: 2 });
      assert.equal(stalePage.total, 8);
      assert.equal(stalePage.page, 2);
      assert.equal(stalePage.totalPages, 1);
      assert.equal(stalePage.items.length, 0);
    } finally {
      await prisma.vehicle.deleteMany({ where: { id: newId } });
      await prisma.$transaction(
        originals.map(({ id, ...data }) =>
          prisma.vehicle.update({ where: { id }, data }),
        ),
      );
    }
  });

  it("searches and sorts staff inventory with validated filters", async () => {
    session = { user: { role: "user" } };
    const changedIds = [ids[0], ids[3], ids[5]];
    const originals = await prisma.vehicle.findMany({
      where: { id: { in: changedIds } },
      select: {
        id: true,
        stockNumber: true,
        make: true,
        model: true,
        variant: true,
        location: true,
        price: true,
        mileage: true,
        updatedAt: true,
      },
    });

    try {
      await prisma.$transaction([
        prisma.vehicle.update({
          where: { id: ids[0] },
          data: {
            stockNumber: "KA-SEARCH-A",
            make: "BMW",
            model: "X5",
            variant: "40i",
            location: "Wien",
            price: new Prisma.Decimal("30000.00"),
            mileage: 10_000,
            updatedAt: new Date("2026-03-01T10:00:00.000Z"),
          },
        }),
        prisma.vehicle.update({
          where: { id: ids[3] },
          data: {
            stockNumber: "KA-SEARCH-B",
            make: "Audi",
            model: "A4",
            variant: "Avant",
            location: "Graz",
            price: new Prisma.Decimal("20000.00"),
            mileage: 20_000,
            updatedAt: new Date("2026-02-01T10:00:00.000Z"),
          },
        }),
        prisma.vehicle.update({
          where: { id: ids[5] },
          data: {
            stockNumber: "KA-SEARCH-C",
            make: "Mercedes",
            model: "C",
            variant: "Estate",
            location: null,
            price: null,
            mileage: null,
            updatedAt: new Date("2026-04-01T10:00:00.000Z"),
          },
        }),
      ]);

      const byMultipleTerms = await queries.listStaffVehicles({
        search: "  BMW   Wien ",
        status: "published",
        pageSize: 100,
      });
      assert.deepEqual(
        byMultipleTerms.items.map(({ id }) => id),
        [ids[0]],
      );
      const noStatusMatch = await queries.listStaffVehicles({
        search: "BMW Wien",
        status: "draft",
      });
      assert.deepEqual(noStatusMatch.items, []);

      const sortCases = [
        ["title", "asc", [ids[3], ids[0], ids[5]]],
        ["title", "desc", [ids[5], ids[0], ids[3]]],
        ["price", "asc", [ids[3], ids[0], ids[5]]],
        ["price", "desc", [ids[0], ids[3], ids[5]]],
        ["mileage", "asc", [ids[0], ids[3], ids[5]]],
        ["mileage", "desc", [ids[3], ids[0], ids[5]]],
        ["status", "asc", [ids[5], ids[0], ids[3]]],
        ["status", "desc", [ids[3], ids[0], ids[5]]],
        ["location", "asc", [ids[3], ids[0], ids[5]]],
        ["location", "desc", [ids[0], ids[3], ids[5]]],
        ["lastUpdatedAt", "asc", [ids[3], ids[0], ids[5]]],
        ["lastUpdatedAt", "desc", [ids[5], ids[0], ids[3]]],
      ] as const;

      for (const [sort, direction, expected] of sortCases) {
        const result = await queries.listStaffVehicles({
          search: "KA-SEARCH",
          sort,
          direction,
          pageSize: 100,
        });
        assert.deepEqual(
          result.items.map(({ id }) => id),
          expected,
          `${sort} ${direction}`,
        );
      }

      for (const input of [
        { search: "x".repeat(101) },
        { search: ["BMW"] },
        { sort: "invalid" },
        { direction: "sideways" },
      ]) {
        await assert.rejects(
          () => queries.listStaffVehicles(input),
          z.ZodError,
        );
      }
    } finally {
      await prisma.$transaction(
        originals.map(({ id, ...data }) =>
          prisma.vehicle.update({ where: { id }, data }),
        ),
      );
    }
  });

  it("serializes every query as plain DTOs with exact money, dates and nullable metrics", async () => {
    session = { user: { role: "user" } };
    const instant = new Date("2026-10-25T01:30:45.123Z");
    try {
      await prisma.vehicle.createMany({
        data: serializationIds.map((id, index) => ({
          id,
          slug: id,
          stockNumber: id.toUpperCase(),
          make: "DTO",
          model: "Serialization",
          dealerId,
          createdById: actorId,
          updatedById: actorId,
          acquisitionDate: new Date("2026-03-29T00:00:00.000Z"),
          createdAt: instant,
          updatedAt: instant,
          ...(index === 0
            ? {
                status: "published",
                inspectionStatus: "passed",
                publishedAt: instant,
                reservedUntil: new Date("2026-12-01T22:15:00.000Z"),
                isFeatured: true,
                price: new Prisma.Decimal("9999999999.99"),
                marginEstimate: new Prisma.Decimal("0.00"),
                powerKw: new Prisma.Decimal("132.01"),
                consumption: new Prisma.Decimal("5.20"),
                consumptionUnit: "l_per_100_km",
                fuelType: "petrol",
                bodyType: "suv",
                mileage: 0,
                ownerCount: 0,
                co2Emission: 0,
                firstRegistration: "2026-03",
                features: ["Navigation"],
                labels: ["Example"],
              }
            : {}),
        })),
      });
      const [
        staffList,
        staff,
        draft,
        catalog,
        detail,
        comparison,
        metadata,
        sitemap,
        inquiry,
        featured,
        related,
        sold,
      ] = await Promise.all([
        queries.listStaffVehicles({ pageSize: 100 }),
        queries.getStaffVehicle(serializationIds[0]),
        queries.getStaffVehicle(serializationIds[1]),
        queries.listPublicVehicles({ search: "DTO Serialization" }),
        queries.getPublicVehicle(serializationIds[0]),
        queries.getPublicComparisonVehicle(serializationIds[0]),
        queries.getPublicVehicleMetadata(serializationIds[0]),
        queries.listPublicVehicleSitemapEntries({ pageSize: 100 }),
        queries.getPublicVehicleForInquiry(serializationIds[0]),
        queries.getFeaturedVehicles(),
        queries.getRelatedVehicles({ id: serializationIds[0] }),
        queries.getStaffVehicle(ids[4]),
      ]);
      for (const result of [
        staffList,
        staff,
        draft,
        catalog,
        detail,
        comparison,
        metadata,
        sitemap,
        inquiry,
        featured,
        related,
        sold,
      ]) {
        assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
      }
      assert.ok(staff && draft && detail && comparison && metadata && sold);
      assert.equal(staff.price, "9999999999.99");
      assert.equal(staff.marginEstimate, "0.00");
      assert.equal(staff.powerKw, 132.01);
      assert.equal(staff.powerPs, 179);
      assert.equal(staff.consumption, 5.2);
      assert.equal(staff.consumptionUnit, "l_per_100_km");
      assert.equal(staff.mileage, 0);
      assert.equal(staff.ownerCount, 0);
      assert.equal(staff.co2Emission, 0);
      assert.equal(staff.firstRegistration, "2026-03");
      assert.equal(staff.acquisitionDate, "2026-03-29");
      assert.equal(staff.createdAt, instant.toISOString());
      assert.equal(staff.updatedAt, instant.toISOString());
      assert.equal(staff.publishedAt, instant.toISOString());
      assert.equal(staff.reservedUntil, "2026-12-01T22:15:00.000Z");
      assert.equal(staff.soldAt, null);
      assert.equal(sold.soldAt, "2026-01-01T10:00:00.000Z");
      assert.equal(detail.price, staff.price);
      assert.equal(comparison.price, staff.price);
      assert.equal(metadata.price, staff.price);
      assert.equal(catalog.items[0]?.price, staff.price);
      assert.equal(metadata.updatedAt, instant.toISOString());
      assert.deepEqual(detail.features, ["Navigation"]);
      assert.deepEqual(detail.labels, ["Example"]);
      for (const field of [
        "price",
        "marginEstimate",
        "powerKw",
        "powerPs",
        "consumption",
        "consumptionUnit",
        "mileage",
        "ownerCount",
        "co2Emission",
        "firstRegistration",
        "publishedAt",
        "reservedUntil",
        "soldAt",
        "variant",
        "description",
        "fuelType",
        "transmissionType",
        "bodyType",
        "exteriorColor",
        "condition",
        "location",
        "vinLastSix",
      ] as const) {
        assert.equal(draft[field], null, field);
      }
      assert.deepEqual(draft.features, []);
      assert.deepEqual(draft.labels, []);
      const rawDraft = await prisma.vehicle.findUniqueOrThrow({
        where: { id: serializationIds[1] },
      });
      assert.throws(
        () => serializePublicVehicle(rawDraft),
        /ineligible public inventory/,
      );
      const rawStaff = await prisma.vehicle.findUniqueOrThrow({
        where: { id: serializationIds[0] },
      });
      const projected = serializePublicVehicle(rawStaff);
      assert.deepEqual(projected, detail);
      for (const field of [
        "stockNumber",
        "marginEstimate",
        "vinLastSix",
        "inspectionStatus",
        "createdById",
        "updatedById",
        "version",
      ]) {
        assert.equal(Object.hasOwn(projected, field), false, field);
      }
    } finally {
      await prisma.vehicle.deleteMany({
        where: { id: { in: serializationIds } },
      });
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
    for (const [read, filter, total] of [
      [queries.listStaffVehicles, {}, 8],
      [queries.listPublicVehicles, {}, 5],
      [queries.listPublicVehicles, { search: "Example" }, 5],
      [queries.listPublicVehicleSitemapEntries, {}, 6],
    ] as const) {
      const maximumSize = await read({ ...filter, page: 1, pageSize: 100 });
      assert.equal(maximumSize.items.length, total);
      assert.equal(maximumSize.total, total);
      assert.equal(maximumSize.pageSize, 100);
      const maximumOffset = await read({
        ...filter,
        page: 2_147_483_648,
        pageSize: 1,
      });
      assert.deepEqual(maximumOffset.items, []);
      assert.equal(maximumOffset.total, total);
      assert.equal(maximumOffset.page, 2_147_483_648);
      assert.equal(maximumOffset.pageSize, 1);
      assert.equal(maximumOffset.totalPages, total);
    }
  });

  it("orders staff by update time while public stock retains featured priority", async () => {
    const changedIds = [ids[6], ids[7]];
    const originals = await prisma.vehicle.findMany({
      where: { id: { in: changedIds } },
      select: { id: true, updatedAt: true },
    });
    session = { user: { role: "user" } };
    try {
      await prisma.$transaction([
        prisma.vehicle.update({
          where: { id: ids[6] },
          data: { updatedAt: new Date("2026-03-01T10:00:00.000Z") },
        }),
        prisma.vehicle.update({
          where: { id: ids[7] },
          data: { updatedAt: new Date("2026-02-01T10:00:00.000Z") },
        }),
      ]);
      const staff = await queries.listStaffVehicles({ pageSize: 100 });
      assert.deepEqual(
        staff.items.map(({ id }) => id),
        [ids[6], ids[7], ...ids.slice(0, 6)],
      );
      for (const search of ["", "Example"]) {
        const pages = await Promise.all(
          [1, 2, 3].map((page) =>
            queries.listPublicVehicles({ search, page, pageSize: 2 }),
          ),
        );
        assert.deepEqual(
          pages.flatMap(({ items }) => items.map(({ id }) => id)),
          [ids[0], ids[1], ids[7], ids[2], ids[3]],
        );
        assert.ok(pages.every(({ total }) => total === 5));
      }
    } finally {
      await prisma.$transaction(
        originals.map(({ id, updatedAt }) =>
          prisma.vehicle.update({ where: { id }, data: { updatedAt } }),
        ),
      );
    }
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
    assert.deepEqual(
      (await queries.getPublicComparisonVehicles([ids[3], ids[0], ids[4]])).map(
        ({ id }) => id,
      ),
      [ids[3], ids[0]],
    );
    assert.deepEqual(
      (
        await queries.getPublicComparisonVehicles([ids[0], `missing-${prefix}`])
      ).map(({ id }) => id),
      [ids[0]],
    );
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
      assert.equal(entry.updatedAt, "2026-01-01T10:00:00.000Z");
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

  it("previews and repeatably imports draft fixtures without overwriting local edits", async () => {
    const actorBefore = await prisma.user.findUniqueOrThrow({
      where: { id: actorId },
    });
    const dealerBefore = await prisma.dealer.findUniqueOrThrow({
      where: { id: dealerId },
    });
    try {
      const preview = runFixtureCommand();
      assert.equal(preview.status, 0, preview.stderr);
      assert.deepEqual(JSON.parse(preview.stdout), {
        mode: "preview",
        total: fixtureIds.length,
        skipped: 0,
        wouldCreate: fixtureIds.length,
        created: 0,
      });
      assert.equal(await prisma.vehicle.count({ where: importedTestRows }), 0);

      const apply = runFixtureCommand(true);
      assert.equal(apply.status, 0, apply.stderr);
      assert.equal(JSON.parse(apply.stdout).created, fixtureIds.length);
      const imported = await prisma.vehicle.findMany({
        where: importedTestRows,
        include: { changes: true },
        orderBy: { id: "asc" },
      });
      assert.equal(imported.length, fixtureIds.length);
      for (const row of imported) {
        const fixture = inventoryFixtures.find(({ id }) => id === row.id);
        assert.ok(fixture);
        assert.equal(row.stockNumber, fixture.stockNumber);
        assert.equal(row.slug, fixture.slug);
        assert.equal(row.price?.toFixed(2), fixture.price.toFixed(2));
        assert.equal(row.powerKw?.toString(), fixture.powerKw.toString());
        assert.equal(row.status, "draft");
        assert.equal(row.inspectionStatus, "pending");
        assert.equal(row.isFeatured, false);
        assert.equal(row.publishedAt, null);
        assert.equal(row.reservedUntil, null);
        assert.equal(row.soldAt, null);
        assert.equal(row.consumption, null);
        assert.equal(row.consumptionUnit, null);
        assert.equal(row.marginEstimate, null);
        assert.equal(row.ownerCount, null);
        assert.equal(row.vinLastSix, null);
        assert.equal(
          row.acquisitionDate.toISOString(),
          "2026-11-17T00:00:00.000Z",
        );
        assert.equal(row.dealerId, dealerId);
        assert.equal(row.createdById, actorId);
        assert.equal(row.updatedById, actorId);
        assert.equal(row.version, 1);
        assert.equal(row.changes.length, 1);
        assert.equal(row.changes[0].actorId, actorId);
        assert.equal(row.changes[0].version, 1);
        assert.equal(row.changes[0].previousStatus, null);
        assert.equal(row.changes[0].status, "draft");
        assert.equal(row.changes[0].previousInspectionStatus, null);
        assert.equal(row.changes[0].inspectionStatus, "pending");
      }
      assert.equal((await queries.listPublicVehicles()).total, 5);
      assert.equal(
        await queries.getPublicVehicle(inventoryFixtures[0].slug),
        null,
      );

      await prisma.$transaction(async (tx) => {
        await tx.vehicle.update({
          where: { id: fixtureIds[0] },
          data: {
            make: "Locally edited",
            slug: `edited-${prefix}`,
            stockNumber: `EDITED-${prefix.toUpperCase()}`,
            price: new Prisma.Decimal("123.45"),
            version: 2,
          },
        });
        await tx.vehicleChange.create({
          data: {
            vehicleId: fixtureIds[0],
            actorId,
            version: 2,
            previousStatus: "draft",
            status: "draft",
            previousInspectionStatus: "pending",
            inspectionStatus: "pending",
          },
        });
      });
      const beforeRepeat = await prisma.vehicle.findMany({
        where: importedTestRows,
        include: { changes: { orderBy: { version: "asc" } } },
        orderBy: { id: "asc" },
      });
      const repeat = runFixtureCommand(true);
      assert.equal(repeat.status, 0, repeat.stderr);
      assert.deepEqual(JSON.parse(repeat.stdout), {
        mode: "apply",
        total: fixtureIds.length,
        skipped: fixtureIds.length,
        wouldCreate: 0,
        created: 0,
      });
      assert.deepEqual(
        await prisma.vehicle.findMany({
          where: importedTestRows,
          include: { changes: { orderBy: { version: "asc" } } },
          orderBy: { id: "asc" },
        }),
        beforeRepeat,
      );

      const removedId = fixtureIds[fixtureIds.length - 1];
      await prisma.$transaction(async (tx) => {
        await tx.vehicleChange.deleteMany({ where: { vehicleId: removedId } });
        await tx.vehicle.delete({ where: { id: removedId } });
      });
      const partial = runFixtureCommand(true);
      assert.equal(partial.status, 0, partial.stderr);
      assert.deepEqual(JSON.parse(partial.stdout), {
        mode: "apply",
        total: fixtureIds.length,
        skipped: fixtureIds.length - 1,
        wouldCreate: 1,
        created: 1,
      });
      assert.deepEqual(
        await prisma.vehicle.findMany({
          where: {
            ...importedTestRows,
            id: { in: fixtureIds.filter((id) => id !== removedId) },
          },
          include: { changes: { orderBy: { version: "asc" } } },
          orderBy: { id: "asc" },
        }),
        beforeRepeat.filter(({ id }) => id !== removedId),
      );
      assert.equal(
        await prisma.vehicle.count({ where: importedTestRows }),
        fixtureIds.length,
      );
      assert.deepEqual(
        await prisma.user.findUniqueOrThrow({ where: { id: actorId } }),
        actorBefore,
      );
      assert.deepEqual(
        await prisma.dealer.findUniqueOrThrow({ where: { id: dealerId } }),
        dealerBefore,
      );
    } finally {
      await prisma.$transaction(deleteImportedTestRows);
    }
  });

  it("refuses unsafe fixture environments and conflicting or invalid imports without partial writes", async () => {
    const apply = (input: unknown) =>
      prisma.$transaction((tx) => importInventoryFixtures(tx, input), {
        isolationLevel: "Serializable",
        timeout: 60000,
      });
    for (const env of [
      { ...process.env, NODE_ENV: "production" },
      { ...process.env, VERCEL_ENV: "production" },
    ] satisfies NodeJS.ProcessEnv[]) {
      const blocked = runFixtureCommand(true, env);
      assert.notEqual(blocked.status, 0);
      assert.match(
        blocked.stderr,
        /production and Vercel execution are refused/,
      );
    }
    await assert.rejects(
      () =>
        apply({
          ...fixtureInput,
          mode: "apply",
          actorId: `missing-${prefix}`,
        }),
      /existing, unbanned staff actor/,
    );
    await assert.rejects(
      () =>
        apply({
          ...fixtureInput,
          mode: "apply",
          dealerId: `missing-${prefix}`,
        }),
      /existing dealership/,
    );
    await assert.rejects(
      () =>
        apply({
          ...fixtureInput,
          mode: "apply",
          acquiredOn: "2026-02-31",
        }),
      z.ZodError,
    );

    const historyFailure = new Error("Intentional fixture history failure");
    await assert.rejects(
      () =>
        prisma.$transaction(
          (tx) =>
            importInventoryFixtures(
              {
                user: tx.user,
                dealer: tx.dealer,
                vehicle: tx.vehicle,
                vehicleChange: new Proxy(tx.vehicleChange, {
                  get(target, property, receiver) {
                    if (property === "createMany") {
                      return () => Promise.reject(historyFailure);
                    }
                    return Reflect.get(target, property, receiver);
                  },
                }),
              },
              { ...fixtureInput, mode: "apply" },
            ),
          { isolationLevel: "Serializable", timeout: 60000 },
        ),
      (error) => error === historyFailure,
    );
    assert.equal(await prisma.vehicle.count({ where: importedTestRows }), 0);

    for (const conflict of [
      { id: fixtureIds[0] },
      { stockNumber: inventoryFixtures[fixtureIds.length - 1].stockNumber },
      { slug: inventoryFixtures[fixtureIds.length - 1].slug },
    ]) {
      const conflictId = conflict.id ?? fixtureConflictId;
      try {
        await prisma.vehicle.create({
          data: {
            id: conflictId,
            stockNumber: `CONFLICT-${prefix.toUpperCase()}`,
            slug: `conflict-${prefix}`,
            make: "Unrelated",
            model: "Conflict",
            dealerId,
            createdById: actorId,
            updatedById: actorId,
            acquisitionDate: new Date("2026-11-17T00:00:00.000Z"),
            ...conflict,
          },
        });
        const before = await prisma.vehicle.findMany({
          where: importedTestRows,
        });
        await assert.rejects(
          () => apply({ ...fixtureInput, mode: "apply" }),
          /identifiers.*(overlap|conflict)/,
        );
        assert.deepEqual(
          await prisma.vehicle.findMany({ where: importedTestRows }),
          before,
        );
        assert.equal(
          await prisma.vehicleChange.count({
            where: { vehicle: importedTestRows },
          }),
          0,
        );
      } finally {
        await prisma.$transaction(deleteImportedTestRows);
      }
    }
    assert.equal(await prisma.vehicle.count({ where: importedTestRows }), 0);
    assert.equal(
      await prisma.user.count({ where: { id: `missing-${prefix}` } }),
      0,
    );
    assert.equal(
      await prisma.dealer.count({ where: { id: `missing-${prefix}` } }),
      0,
    );
  });

  it("saves dealership settings for staff with validation, conflict and public refresh", async () => {
    const publicSettings =
      await dealershipSettings.getPublicDealershipSettings();
    assert.equal(publicSettings.name, "Query test dealership");
    assert.equal(Object.hasOwn(publicSettings, "version"), false);

    await assert.rejects(
      dealershipSettings.getAdminDealershipSettings(),
      AuthorizationError,
    );
    const denied = await dealershipSettings.updateDealershipSettings({
      ...publicSettings,
      expectedVersion: 1,
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) {
      assert.equal(denied.kind, "unauthorized");
    }

    session = { user: { role: "user" } };
    const current = await dealershipSettings.getAdminDealershipSettings();
    const { version, ...fields } = current;
    const invalid = await dealershipSettings.updateDealershipSettings({
      ...fields,
      email: "invalid",
      expectedVersion: version,
    });
    assert.equal(invalid.ok, false);
    if (!invalid.ok) {
      assert.equal(invalid.kind, "invalid");
    }

    const saved = await dealershipSettings.updateDealershipSettings({
      ...fields,
      name: "Updated query test dealership",
      websiteUrl: "https://business.example",
      expectedVersion: version,
    });
    assert.equal(saved.ok, true);
    if (!saved.ok) {
      throw new Error("Valid dealership settings must save.");
    }
    assert.equal(saved.settings.version, version + 1);
    assert.equal(saved.settings.name, "Updated query test dealership");
    assert.equal(saved.settings.websiteUrl, "https://business.example");
    assert.equal(revalidatedPath, "/:layout");
    assert.deepEqual(getTrustedOrigins(true), ["https://www.kuraishicars.com"]);

    const refreshedPublicSettings =
      await dealershipSettings.getPublicDealershipSettings();
    assert.equal(refreshedPublicSettings.name, saved.settings.name);
    assert.equal(refreshedPublicSettings.websiteUrl, saved.settings.websiteUrl);

    const stale = await dealershipSettings.updateDealershipSettings({
      ...fields,
      expectedVersion: version,
    });
    assert.equal(stale.ok, false);
    if (!stale.ok) {
      assert.equal(stale.kind, "conflict");
    }

    const failure = new Error("Settings database unavailable.");
    databaseFailure = failure;
    await assert.rejects(
      dealershipSettings.updateDealershipSettings({
        ...fields,
        expectedVersion: saved.settings.version,
      }),
      (error) => error === failure,
    );
  });

  it("distinguishes malformed input from well-formed not-found lookups", async () => {
    session = { user: { role: "user" } };
    const invalid = [
      () => queries.getStaffVehicle("../private"),
      () => queries.getPublicVehicle("../private"),
      () => queries.getPublicVehicle("car?private=true"),
      () => queries.getPublicVehicle(null),
      () => queries.getPublicComparisonVehicle("../private"),
      () => queries.getPublicComparisonVehicles([ids[0], ids[0]]),
      () =>
        queries.getPublicComparisonVehicles([ids[0], ids[1], ids[2], ids[3]]),
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
    databaseFailure = new Error(
      "Malformed pagination must fail before database access.",
    );
    try {
      for (const read of [
        queries.listStaffVehicles,
        queries.listPublicVehicles,
        queries.listPublicVehicleSitemapEntries,
      ]) {
        for (const input of [
          null,
          { page: "1" },
          { page: 1.5 },
          { page: NaN },
          { page: Infinity },
          { page: Number.MAX_SAFE_INTEGER + 1 },
          { page: 2_147_483_649, pageSize: 1 },
          { pageSize: 0 },
          { pageSize: -1 },
          { pageSize: 1.5 },
          { pageSize: "8" },
          { privateFilter: true },
        ]) {
          await assert.rejects(() => read(input), z.ZodError);
        }
      }
    } finally {
      databaseFailure = undefined;
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

  it("accepts each inquiry type durably and enforces five new requests with idempotent retries", async () => {
    const clientHash = createHash("sha256")
      .update(`inquiry-${prefix}`)
      .digest("hex");
    inquiryClients.push(clientHash);
    const now = new Date();
    const submissions = inquiryAppointmentTypes.map(
      (appointmentType): InquirySubmission => {
        const requestId = randomUUID();
        inquiryKeys.push(requestId);
        return {
          requestId,
          fields: {
            name: "Synthetic Visitor",
            email: "visitor@example.invalid",
            phone: "",
            appointmentType,
            preferredDate: dealershipDate(now),
            message: "Synthetic test inquiry.",
            consent: true,
          },
          vehicleSlug: null,
          website: "",
          privacyNoticeVersion: inquiryPrivacyNotice.version,
        };
      },
    );
    const identity = (submission: InquirySubmission) => ({
      clientHash,
      payloadHash: createHash("sha256")
        .update(JSON.stringify(submission))
        .digest("hex"),
    });
    session = { user: { role: "user", id: actorId } };
    const dashboardBefore =
      await adminDashboardQueries.getAdminDashboardMetrics();
    await prisma.vehicle.update({
      where: { id: ids[6] },
      data: { soldAt: new Date("2025-12-15T10:00:00.000Z") },
    });
    for (const submission of submissions) {
      await inquiryIntake.acceptInquiry(submission, identity(submission), now);
    }
    const first = await prisma.inquiry.findUniqueOrThrow({
      where: { submissionKey: submissions[0].requestId },
    });
    assert.equal(first.customerName, "Synthetic Visitor");
    assert.equal(first.customerPhone, null);
    assert.equal(first.privacyNoticeText, inquiryPrivacyNotice.text);
    assert.equal(first.privacyAcknowledgedAt.toISOString(), now.toISOString());
    assert.equal(
      first.preferredDate?.toISOString().slice(0, 10),
      dealershipDate(now),
    );
    assert.equal(first.vehicleId, null);
    await prisma.inquiry.update({
      where: { id: first.id },
      data: {
        vehicleTitleSnapshot: "Historical Example Model",
        vehicleSlugSnapshot: "historical-example-model",
      },
    });
    await prisma.inquiryNotification.update({
      where: { inquiryId: first.id },
      data: {
        status: "failed",
        attemptCount: 5,
        lastErrorCode: "provider_unavailable",
      },
    });
    const inbox = await adminInquiryQueries.getAdminInquiryPage({
      q: "Synthetic test inquiry",
      page: "1",
      lead: first.id,
    });
    assert.equal(inbox.total, 5);
    assert.equal(inbox.items.length, 5);
    assert.equal(
      inbox.items.find(({ id }) => id === first.id)?.deliveryStatus,
      "failed",
    );
    assert.equal(inbox.selectedInquiry?.id, first.id);
    assert.equal(inbox.selectedInquiry?.message, "Synthetic test inquiry.");
    assert.equal(
      inbox.selectedInquiry?.delivery?.lastErrorCode,
      "provider_unavailable",
    );
    assert.equal("privacyNoticeText" in (inbox.selectedInquiry ?? {}), false);

    const dashboardAfterIntake =
      await adminDashboardQueries.getAdminDashboardMetrics();
    assert.equal(dashboardAfterIntake.leadCount, dashboardBefore.leadCount + 5);
    assert.equal(
      dashboardAfterIntake.vehicleInquiryCount,
      dashboardBefore.vehicleInquiryCount + 1,
    );
    assert.equal(dashboardAfterIntake.soldCount, dashboardBefore.soldCount + 1);
    assert.equal(dashboardAfterIntake.recentInquiries.length, 5);
    assert.equal(
      dashboardAfterIntake.recentInquiries.find(({ id }) => id === first.id)
        ?.vehicleInterest,
      "Historical Example Model",
    );
    assert.equal(
      dashboardAfterIntake.inventoryTotal,
      await prisma.vehicle.count(),
    );
    assert.equal(
      Object.values(dashboardAfterIntake.statusCounts).reduce(
        (sum, count) => sum + count,
        0,
      ),
      dashboardAfterIntake.inventoryTotal,
    );
    assert.equal(
      dashboardAfterIntake.soldCount,
      await prisma.vehicle.count({ where: { soldAt: { not: null } } }),
    );

    const savedNote = await adminInquiryNotes.addAdminInquiryNote({
      inquiryId: first.id,
      content: "  Synthetic staff follow-up.\nCheck availability.  ",
    });
    assert.deepEqual(savedNote, { ok: true });
    assert.equal(revalidatedPath, "/admin/leads");

    const concurrentNotes = await Promise.all([
      adminInquiryNotes.addAdminInquiryNote({
        inquiryId: first.id,
        content: "First concurrent note.",
      }),
      adminInquiryNotes.addAdminInquiryNote({
        inquiryId: first.id,
        content: "Second concurrent note.",
      }),
    ]);
    assert.deepEqual(concurrentNotes, [{ ok: true }, { ok: true }]);

    const updatedInbox = await adminInquiryQueries.getAdminInquiryPage({
      q: "Synthetic test inquiry",
      page: "1",
      lead: first.id,
    });
    assert.equal(
      updatedInbox.items.find(({ id }) => id === first.id)?.notesCount,
      3,
    );
    assert.equal(updatedInbox.selectedInquiry?.notes.length, 3);
    assert.equal(
      updatedInbox.selectedInquiry?.notes[0]?.authorName,
      "Inventory query test",
    );
    assert.deepEqual(
      new Set(
        updatedInbox.selectedInquiry?.notes.map(({ content }) => content),
      ),
      new Set([
        "Synthetic staff follow-up.\nCheck availability.",
        "First concurrent note.",
        "Second concurrent note.",
      ]),
    );

    const invalidNote = await adminInquiryNotes.addAdminInquiryNote({
      inquiryId: first.id,
      content: " ",
    });
    assert.equal(invalidNote.ok, false);
    if (!invalidNote.ok) assert.equal(invalidNote.kind, "invalid");

    const unknownNote = await adminInquiryNotes.addAdminInquiryNote({
      inquiryId: `missing-${prefix}`,
      content: "Should not be stored.",
    });
    assert.equal(unknownNote.ok, false);
    if (!unknownNote.ok) assert.equal(unknownNote.kind, "not_found");

    session = null;
    await assert.rejects(
      adminDashboardQueries.getAdminDashboardMetrics(),
      AuthorizationError,
    );
    const unauthorizedNote = await adminInquiryNotes.addAdminInquiryNote({
      inquiryId: first.id,
      content: "Unauthorized note.",
    });
    assert.equal(unauthorizedNote.ok, false);
    if (!unauthorizedNote.ok) {
      assert.equal(unauthorizedNote.kind, "unauthorized");
    }
    await assert.rejects(
      adminInquiryQueries.getAdminInquiryPage({ q: "", page: "1" }),
      AuthorizationError,
    );
    const replay = submissions[0];
    await inquiryIntake.acceptInquiry(
      replay,
      identity(replay),
      new Date(now.getTime() + 86400000),
    );
    await assert.rejects(
      inquiryIntake.acceptInquiry(replay, {
        clientHash,
        payloadHash: "0".repeat(64),
      }),
      (error: unknown) =>
        error instanceof InquiryIntakeError && error.status === 409,
    );
    const sixth = { ...replay, requestId: randomUUID() };
    inquiryKeys.push(sixth.requestId);
    await assert.rejects(
      inquiryIntake.acceptInquiry(sixth, identity(sixth), now),
      (error: unknown) =>
        error instanceof InquiryIntakeError && error.status === 429,
    );
    assert.equal(
      await prisma.inquiry.count({
        where: { submissionKey: { in: inquiryKeys } },
      }),
      5,
    );
    await inquiryIntake.acceptInquiry(
      sixth,
      identity(sixth),
      new Date(now.getTime() + 901000),
    );
    assert.equal(
      (
        await prisma.inquiryRateLimit.findUniqueOrThrow({
          where: { key: clientHash },
        })
      ).count,
      1,
    );
  });

  it("revalidates inquiry vehicle context and rejects forged or unavailable references", async () => {
    const clientHash = createHash("sha256")
      .update(`context-${prefix}`)
      .digest("hex");
    inquiryClients.push(clientHash);
    const submission = (vehicleSlug: string | null): InquirySubmission => {
      const requestId = randomUUID();
      inquiryKeys.push(requestId);
      return {
        requestId,
        fields: {
          name: "Context Visitor",
          email: "context@example.invalid",
          appointmentType: "Beratung",
          message: "Synthetic context.",
          consent: true,
        },
        vehicleSlug,
        website: "",
        privacyNoticeVersion: inquiryPrivacyNotice.version,
      };
    };
    const identity = (input: InquirySubmission) => ({
      clientHash,
      payloadHash: createHash("sha256")
        .update(JSON.stringify(input))
        .digest("hex"),
    });
    for (const index of [0, 3]) {
      const input = submission(slug(index));
      await inquiryIntake.acceptInquiry(input, identity(input));
      const saved = await prisma.inquiry.findUniqueOrThrow({
        where: { submissionKey: input.requestId },
      });
      assert.equal(saved.vehicleId, ids[index]);
      assert.equal(saved.vehicleSlugSnapshot, slug(index));
      assert.equal(saved.vehicleTitleSnapshot, `Example Query ${index}`);
    }
    for (const vehicleSlug of [
      slug(4),
      slug(5),
      slug(6),
      `missing-${prefix}`,
    ]) {
      const input = submission(vehicleSlug);
      await assert.rejects(
        inquiryIntake.acceptInquiry(input, identity(input)),
        (error: unknown) =>
          error instanceof InquiryIntakeError && error.status === 409,
      );
      assert.equal(
        await prisma.inquiry.findUnique({
          where: { submissionKey: input.requestId },
        }),
        null,
      );
    }
    const input = submission(null);
    for (const forged of [
      { ...input, vehicleId: ids[0] },
      { ...input, fields: { ...input.fields, source: "callback" } },
      { ...input, fields: { ...input.fields, consent: false } },
      { ...input, fields: { ...input.fields, preferredDate: "2000-01-01" } },
    ]) {
      await assert.rejects(
        inquiryIntake.acceptInquiry(forged, identity(input)),
        z.ZodError,
      );
    }
    await assert.rejects(
      inquiryIntake.acceptInquiry(
        { ...input, privacyNoticeVersion: "stale-version" },
        identity(input),
      ),
      (error: unknown) =>
        error instanceof InquiryIntakeError && error.status === 409,
    );
    const failure = new Error("Synthetic inquiry database failure.");
    databaseFailure = failure;
    await assert.rejects(
      inquiryIntake.acceptInquiry(input, identity(input)),
      (error) => error === failure,
    );
    databaseFailure = undefined;
    assert.equal(
      await prisma.inquiry.findUnique({
        where: { submissionKey: input.requestId },
      }),
      null,
    );
  });

  it("accepts simultaneous retries once without spending extra submission quota", async () => {
    const clientHash = createHash("sha256")
      .update(`retry-${prefix}`)
      .digest("hex");
    inquiryClients.push(clientHash);
    const requestId = randomUUID();
    inquiryKeys.push(requestId);
    const input = {
      requestId,
      fields: {
        name: "Retry Visitor",
        email: "retry@example.invalid",
        appointmentType: "Beratung",
        message: "Synthetic retry.",
        consent: true,
      },
      vehicleSlug: null,
      website: "",
      privacyNoticeVersion: inquiryPrivacyNotice.version,
    };
    const identity = {
      clientHash,
      payloadHash: createHash("sha256").update(requestId).digest("hex"),
    };
    await Promise.all([
      inquiryIntake.acceptInquiry(input, identity),
      inquiryIntake.acceptInquiry(input, identity),
      inquiryIntake.acceptInquiry(input, identity),
    ]);
    assert.equal(
      await prisma.inquiry.count({ where: { submissionKey: requestId } }),
      1,
    );
    assert.equal(
      (
        await prisma.inquiryRateLimit.findUniqueOrThrow({
          where: { key: clientHash },
        })
      ).count,
      1,
    );
  });

  it("propagates database failures instead of returning demo or success-shaped data", async () => {
    session = { user: { role: "user" } };
    const failure = new Error("Intentional query failure");
    databaseFailure = failure;
    try {
      for (const operation of [
        () => queries.listStaffVehicles(),
        () => queries.getStaffVehicle(ids[0]),
        () => queries.listPublicVehicles(),
        () => queries.getPublicVehicle(slug(0)),
        () => queries.getFeaturedVehicles(),
        () => queries.listPublicVehicles({ search: "Example" }),
        () => queries.getRelatedVehicles({ id: ids[0] }),
        () => queries.getPublicComparisonVehicle(ids[0]),
        () => queries.getPublicComparisonVehicles([ids[0]]),
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
