import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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
import { serializePublicVehicle } from "../src/lib/inventory-dto.ts";
import {
  getPublicVehicleEligibilitySql,
  getPublicVehicleWhere,
} from "../src/lib/inventory-eligibility.ts";
import { getPublicVehicleVisibility } from "../src/lib/inventory-policy.ts";
import { filterVehicles } from "../src/lib/vehicle-filters.ts";
import {
  importInventoryFixtures,
  inventoryFixtures,
} from "./inventory-fixtures.ts";
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
