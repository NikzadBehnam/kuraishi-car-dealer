import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { Prisma } from "../src/generated/prisma/client.ts";
import { createInventoryTestDatabase } from "./inventory-test-client.ts";

const { prisma, connectionString } = createInventoryTestDatabase();

function runPrisma(args: string[]) {
  const result = spawnSync(
    process.execPath,
    ["node_modules\\prisma\\build\\index.js", ...args],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        DIRECT_URL: connectionString,
        DATABASE_URL: connectionString,
      },
    },
  );
  if (result.error) {
    throw result.error;
  }
  assert.equal(
    result.status,
    0,
    `${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`,
  );
}

async function authFingerprint() {
  const rows = await prisma.$queryRaw<{ state: string }[]>`
    SELECT jsonb_build_object(
      'user', (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text, '[]')) FROM "user" t),
      'session', (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text, '[]')) FROM "session" t),
      'account', (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text, '[]')) FROM "account" t),
      'verification', (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text, '[]')) FROM "verification" t),
      'rateLimit', (SELECT md5(coalesce(jsonb_agg(to_jsonb(t) ORDER BY id)::text, '[]')) FROM "rateLimit" t),
      'columns', (
        SELECT md5(jsonb_agg(to_jsonb(c) ORDER BY table_name, ordinal_position)::text)
        FROM information_schema.columns c
        WHERE table_schema = 'public'
        AND table_name IN ('user', 'session', 'account', 'verification', 'rateLimit')
      )
    )::text AS state
  `;
  return rows[0].state;
}

const rollback = new Error("Roll back isolated test data.");

function hasPostgresCode(error: unknown, code: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  const adapter = error.meta?.driverAdapterError;
  if (
    typeof adapter !== "object" ||
    adapter === null ||
    !("cause" in adapter)
  ) {
    return false;
  }
  const cause = adapter.cause;
  return (
    typeof cause === "object" &&
    cause !== null &&
    "originalCode" in cause &&
    cause.originalCode === code
  );
}

async function withVehicle(
  verify: (tx: Prisma.TransactionClient, vehicleId: string) => Promise<void>,
) {
  const vehicleId = randomUUID();
  await assert.rejects(
    prisma.$transaction(
      async (tx) => {
        const actor = await tx.user.create({
          data: {
            id: randomUUID(),
            name: "Inventory migration test",
            email: `${randomUUID()}@example.invalid`,
          },
        });
        const dealer = await tx.dealer.create({
          data: { name: "Test dealership" },
        });
        await tx.vehicle.create({
          data: {
            id: vehicleId,
            slug: `test-${vehicleId}`,
            stockNumber: `TEST-${vehicleId.toUpperCase()}`,
            make: "Example",
            model: "Migration",
            dealerId: dealer.id,
            createdById: actor.id,
            updatedById: actor.id,
            acquisitionDate: new Date("2026-11-17T00:00:00.000Z"),
          },
        });
        await verify(tx, vehicleId);
        throw rollback;
      },
      { timeout: 60000 },
    ),
    (error: unknown) => {
      if (error !== rollback) {
        throw error;
      }
      return true;
    },
  );
  assert.equal(await prisma.vehicle.count({ where: { id: vehicleId } }), 0);
}

describe("isolated inventory migration", { concurrency: false }, () => {
  let originalAuthState: string | undefined;

  before(async () => {
    originalAuthState = await authFingerprint();
    runPrisma(["migrate", "deploy"]);
    assert.equal(
      await authFingerprint(),
      originalAuthState,
      "Migration changed auth data/schema.",
    );
    runPrisma(["migrate", "deploy"]);
    assert.equal(
      await authFingerprint(),
      originalAuthState,
      "Repeat deploy changed auth data/schema.",
    );
    runPrisma([
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      "prisma\\schema.prisma",
      "--exit-code",
    ]);
  });

  after(async () => {
    try {
      if (originalAuthState !== undefined) {
        assert.equal(
          await authFingerprint(),
          originalAuthState,
          "Database tests changed preserved auth data/schema.",
        );
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  it("round-trips incomplete drafts, exact money and explicit technical units", async () => {
    await withVehicle(async (tx, id) => {
      const draft = await tx.vehicle.findUniqueOrThrow({ where: { id } });
      assert.equal(draft.status, "draft");
      assert.equal(draft.inspectionStatus, "pending");
      assert.equal(draft.price, null);
      assert.equal(draft.mileage, null);
      assert.equal(draft.isFeatured, false);
      assert.deepEqual(draft.features, []);
      const updated = await tx.vehicle.update({
        where: { id },
        data: {
          price: new Prisma.Decimal("19999.99"),
          marginEstimate: new Prisma.Decimal("0.10"),
          powerKw: new Prisma.Decimal("100.25"),
          firstRegistration: "2024-05",
          mileage: 0,
          ownerCount: 0,
          vinLastSix: "123456",
          fuelType: "electric",
          consumption: new Prisma.Decimal("15.25"),
          consumptionUnit: "kwh_per_100_km",
          co2Emission: 0,
        },
      });
      assert.equal(updated.price?.toFixed(2), "19999.99");
      assert.equal(updated.marginEstimate?.toFixed(2), "0.10");
      assert.equal(updated.powerKw?.toFixed(2), "100.25");
      assert.equal(updated.consumption?.toFixed(2), "15.25");
      assert.equal(updated.consumptionUnit, "kwh_per_100_km");
      assert.equal(updated.firstRegistration, "2024-05");
      assert.equal(updated.co2Emission, 0);
    });
  });

  it("preserves storage boundaries and leap-day acquisition without inventing timestamps", async () => {
    await withVehicle(async (tx, id) => {
      const minimum = await tx.vehicle.update({
        where: { id },
        data: {
          price: new Prisma.Decimal("0.01"),
          marginEstimate: new Prisma.Decimal("0.00"),
          powerKw: new Prisma.Decimal("0.01"),
          consumption: new Prisma.Decimal("0.00"),
          consumptionUnit: "kwh_per_100_km",
          fuelType: "electric",
          mileage: 0,
          ownerCount: 0,
          co2Emission: 0,
          acquisitionDate: new Date("2024-02-29T00:00:00.000Z"),
          firstRegistration: "2024-02",
        },
      });
      assert.equal(minimum.price?.toFixed(2), "0.01");
      assert.equal(minimum.marginEstimate?.toFixed(2), "0.00");
      assert.equal(minimum.powerKw?.toFixed(2), "0.01");
      assert.equal(minimum.consumption?.toFixed(2), "0.00");
      assert.equal(minimum.mileage, 0);
      assert.equal(minimum.ownerCount, 0);
      assert.equal(minimum.co2Emission, 0);
      assert.equal(
        minimum.acquisitionDate.toISOString(),
        "2024-02-29T00:00:00.000Z",
      );
      assert.equal(minimum.firstRegistration, "2024-02");
      assert.equal(minimum.publishedAt, null);
      assert.equal(minimum.reservedUntil, null);
      assert.equal(minimum.soldAt, null);

      const maximum = await tx.vehicle.update({
        where: { id },
        data: {
          price: new Prisma.Decimal("9999999999.99"),
          marginEstimate: new Prisma.Decimal("9999999999.99"),
          powerKw: new Prisma.Decimal("99999.99"),
          consumption: new Prisma.Decimal("9999.99"),
          mileage: 2_147_483_647,
          ownerCount: 2_147_483_647,
          co2Emission: 2_147_483_647,
        },
      });
      assert.equal(maximum.price?.toFixed(2), "9999999999.99");
      assert.equal(maximum.marginEstimate?.toFixed(2), "9999999999.99");
      assert.equal(maximum.powerKw?.toFixed(2), "99999.99");
      assert.equal(maximum.consumption?.toFixed(2), "9999.99");
      assert.equal(maximum.mileage, 2_147_483_647);
      assert.equal(maximum.ownerCount, 2_147_483_647);
      assert.equal(maximum.co2Emission, 2_147_483_647);
    });
  });

  it("rejects malformed values, contradictory publication and broken references", async () => {
    await withVehicle(async (tx, id) => {
      const cases: [string, Prisma.Sql, string][] = [
        ["zero price", Prisma.sql`"price" = 0`, "23514"],
        ["negative price", Prisma.sql`"price" = -1`, "23514"],
        ["NaN price", Prisma.sql`"price" = 'NaN'::numeric`, "23514"],
        ["price overflow", Prisma.sql`"price" = 10000000000`, "22003"],
        ["negative margin", Prisma.sql`"marginEstimate" = -0.01`, "23514"],
        [
          "margin overflow",
          Prisma.sql`"marginEstimate" = 10000000000`,
          "22003",
        ],
        ["zero power", Prisma.sql`"powerKw" = 0`, "23514"],
        ["power overflow", Prisma.sql`"powerKw" = 100000`, "22003"],
        ["negative owners", Prisma.sql`"ownerCount" = -1`, "23514"],
        ["negative emissions", Prisma.sql`"co2Emission" = -1`, "23514"],
        [
          "negative consumption",
          Prisma.sql`"fuelType" = 'electric', "consumption" = -0.01, "consumptionUnit" = 'kwh_per_100_km'`,
          "23514",
        ],
        [
          "consumption overflow",
          Prisma.sql`"fuelType" = 'electric', "consumption" = 10000, "consumptionUnit" = 'kwh_per_100_km'`,
          "22003",
        ],
        ["negative mileage", Prisma.sql`"mileage" = -1`, "23514"],
        ["mileage overflow", Prisma.sql`"mileage" = 2147483648`, "22003"],
        ["fractional integer", Prisma.sql`"mileage" = '1.5'`, "22P02"],
        ["invalid month", Prisma.sql`"firstRegistration" = '2024-13'`, "23514"],
        ["zero month", Prisma.sql`"firstRegistration" = '2024-00'`, "23514"],
        [
          "invalid leap day",
          Prisma.sql`"acquisitionDate" = '2025-02-29'`,
          "22008",
        ],
        [
          "invalid instant",
          Prisma.sql`"reservedUntil" = '2026-02-30T12:00:00Z'`,
          "22008",
        ],
        ["short VIN", Prisma.sql`"vinLastSix" = '12345'`, "23514"],
        ["lowercase stock", Prisma.sql`"stockNumber" = 'lowercase'`, "23514"],
        ["missing unit", Prisma.sql`"consumption" = 5`, "23514"],
        [
          "unit without value",
          Prisma.sql`"consumptionUnit" = 'l_per_100_km'`,
          "23514",
        ],
        [
          "unknown consumption fuel",
          Prisma.sql`"consumption" = 5, "consumptionUnit" = 'l_per_100_km'`,
          "23514",
        ],
        [
          "wrong unit",
          Prisma.sql`"fuelType" = 'electric', "consumption" = 5, "consumptionUnit" = 'l_per_100_km'`,
          "23514",
        ],
        [
          "uninspected public",
          Prisma.sql`"status" = 'published', "publishedAt" = now()`,
          "23514",
        ],
        ["unpublished featured", Prisma.sql`"isFeatured" = true`, "23514"],
        [
          "missing publication time",
          Prisma.sql`"status" = 'published', "inspectionStatus" = 'passed'`,
          "23514",
        ],
        [
          "missing sale time",
          Prisma.sql`"status" = 'sold', "publishedAt" = now()`,
          "23514",
        ],
        ["invalid version", Prisma.sql`"version" = 0`, "23514"],
        ["null features", Prisma.sql`"features" = NULL`, "23514"],
        [
          "null label element",
          Prisma.sql`"labels" = ARRAY[NULL]::text[]`,
          "23514",
        ],
        ["unsupported status", Prisma.sql`"status" = 'unknown'`, "22P02"],
        [
          "missing dealer",
          Prisma.sql`"dealerId" = 'nonexistent-test-dealer'`,
          "23503",
        ],
      ];
      for (const [label, assignment, sqlState] of cases) {
        await tx.$executeRaw`SAVEPOINT constraint_case`;
        try {
          await assert.rejects(
            tx.$executeRaw(
              Prisma.sql`UPDATE "Vehicle" SET ${assignment} WHERE "id" = ${id}`,
            ),
            (error: unknown) => hasPostgresCode(error, sqlState),
            label,
          );
        } finally {
          await tx.$executeRaw`ROLLBACK TO SAVEPOINT constraint_case`;
          await tx.$executeRaw`RELEASE SAVEPOINT constraint_case`;
        }
      }
    });
  });

  it("keeps archived identifiers unique without making VIN fragments unique", async () => {
    await withVehicle(async (tx, id) => {
      const source = await tx.vehicle.findUniqueOrThrow({ where: { id } });
      const second = await tx.vehicle.create({
        data: {
          ...source,
          id: randomUUID(),
          slug: `${source.slug}-second`,
          stockNumber: `${source.stockNumber}-SECOND`,
          vinLastSix: "123456",
        },
      });
      await tx.vehicle.update({
        where: { id },
        data: { vinLastSix: "123456", status: "archived" },
      });
      for (const field of ["slug", "stockNumber"] as const) {
        await tx.$executeRaw`SAVEPOINT unique_case`;
        try {
          await assert.rejects(
            tx.vehicle.update({
              where: { id: second.id },
              data: { [field]: source[field] },
            }),
            (error: unknown) =>
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002",
          );
        } finally {
          await tx.$executeRaw`ROLLBACK TO SAVEPOINT unique_case`;
          await tx.$executeRaw`RELEASE SAVEPOINT unique_case`;
        }
      }
    });
  });
});
