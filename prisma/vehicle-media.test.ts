import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";

import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  assertAuthenticatedSession,
  type AuthSession,
} from "../src/lib/auth-access.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
} from "../src/lib/media-storage.ts";
import { ZodError } from "zod";
import { createMediaTestDatabase } from "./media-test-client.ts";

const { prisma, connectionString } = createMediaTestDatabase();
const s3 = getMediaStorageClient();
const bucket = getPrivateMediaBucket();
const actorId = randomUUID();
const dealerId = randomUUID();
const imageBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

type TestSession = AuthSession & {
  user: { id: string; role?: string | null };
};

let session: TestSession | null = null;
let dbMock: ReturnType<typeof mock.module> | undefined;
let sessionMock: ReturnType<typeof mock.module> | undefined;
let mutations: typeof import("../src/lib/inventory-mutations.ts");
let queries: typeof import("../src/lib/inventory-queries.ts");
let triggerInstalled = false;
const objectKeys: string[] = [];

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
  const output = `${result.stdout}\n${result.stderr}`.replaceAll(
    connectionString,
    "<redacted media-test URL>",
  );
  assert.equal(result.status, 0, `${args.join(" ")} failed:\n${output}`);
}

async function createImageAsset({
  type = "image",
  putObject = true,
}: {
  type?: "image" | "document";
  putObject?: boolean;
} = {}) {
  const id = randomUUID();
  const objectKey = `assets/test-${id}.png`;
  if (putObject) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: imageBytes,
        ContentType: "image/png",
      }),
    );
    objectKeys.push(objectKey);
  }
  await prisma.mediaAsset.create({
    data: {
      id,
      objectKey,
      bucketAccess: "private",
      type,
      title: "Test image",
      originalFilename: "test.png",
      verifiedMimeType: type === "image" ? "image/png" : "application/pdf",
      sizeBytes: BigInt(imageBytes.length),
      uploadedById: actorId,
    },
  });
  return id;
}

async function createDraft(
  mediaAssetIds: string[] = [],
  stockNumber = `TEST-${randomUUID().slice(0, 8)}`,
) {
  const result = await mutations.createDraftVehicle({
    stockNumber,
    slug: stockNumber.toLowerCase(),
    make: "Skoda",
    model: "Octavia",
    mediaAssetIds,
  });
  return result;
}

describe("vehicle draft media persistence on isolated Neon resources", () => {
  before(async () => {
    runPrisma(["migrate", "deploy"]);
    runPrisma([
      "migrate",
      "diff",
      "--from-config-datasource",
      "--to-schema",
      "prisma\\schema.prisma",
      "--exit-code",
    ]);

    await prisma.user.create({
      data: {
        id: actorId,
        name: "Vehicle media test",
        email: `${actorId}@example.invalid`,
      },
    });
    await prisma.dealer.create({
      data: { id: dealerId, name: "Vehicle media test dealership" },
    });

    dbMock = mock.module("../src/lib/db.ts", {
      namedExports: { prisma },
    });
    sessionMock = mock.module("../src/lib/session.ts", {
      namedExports: {
        requireSession: async () => assertAuthenticatedSession(session),
      },
    });
    mutations = await import("../src/lib/inventory-mutations.ts");
    queries = await import("../src/lib/inventory-queries.ts");
  });

  after(async () => {
    try {
      if (triggerInstalled) {
        await prisma.$executeRawUnsafe(
          'DROP TRIGGER IF EXISTS "test_fail_vehicle_media" ON "VehicleMedia"',
        );
        await prisma.$executeRawUnsafe(
          'DROP FUNCTION IF EXISTS "test_fail_vehicle_media_fn"()',
        );
      }
      await prisma.vehicleChange.deleteMany({
        where: { vehicle: { createdById: actorId } },
      });
      await prisma.vehicle.deleteMany({ where: { createdById: actorId } });
      await prisma.mediaUploadIntent.deleteMany({
        where: { uploadedById: actorId },
      });
      await prisma.mediaAsset.deleteMany({ where: { uploadedById: actorId } });
      await prisma.dealer.deleteMany({ where: { id: dealerId } });
      await prisma.user.deleteMany({ where: { id: actorId } });
      for (const objectKey of objectKeys) {
        await s3.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }),
        );
      }
    } finally {
      dbMock?.restore();
      sessionMock?.restore();
      await prisma.$disconnect();
      s3.destroy();
    }
  });

  it("requires a fresh staff session before validating or writing", async () => {
    await assert.rejects(
      mutations.createDraftVehicle({ invalid: true }),
      (error: unknown) =>
        error instanceof Error && error.name === "AuthorizationError",
    );
    assert.equal(
      await prisma.vehicle.count({ where: { createdById: actorId } }),
      0,
    );
  });

  it("fails explicitly until exactly one dealership is configured", async () => {
    session = { user: { id: actorId, role: "user" } };
    await prisma.dealer.delete({ where: { id: dealerId } });
    try {
      await assert.rejects(
        mutations.createDraftVehicle({
          stockNumber: `TEST-${randomUUID().slice(0, 8)}`,
          slug: `test-${randomUUID().slice(0, 8)}`,
          make: "Skoda",
          model: "Octavia",
        }),
        (error: unknown) =>
          error instanceof Error &&
          error.name === "InventoryMutationError" &&
          "status" in error &&
          error.status === 503,
      );
    } finally {
      await prisma.dealer.create({
        data: { id: dealerId, name: "Vehicle media test dealership" },
      });
    }
    const secondDealerId = randomUUID();
    await prisma.dealer.create({
      data: { id: secondDealerId, name: "Unexpected second dealership" },
    });
    try {
      await assert.rejects(
        createDraft(),
        (error: unknown) =>
          error instanceof Error &&
          error.name === "InventoryMutationError" &&
          "status" in error &&
          error.status === 503,
      );
    } finally {
      await prisma.dealer.delete({ where: { id: secondDealerId } });
    }
    assert.equal(
      await prisma.vehicle.count({ where: { createdById: actorId } }),
      0,
    );
  });

  it("rejects forged lifecycle fields and invalid ordered image lists", async () => {
    session = { user: { id: actorId, role: "user" } };
    await assert.rejects(
      mutations.createDraftVehicle({
        stockNumber: "TEST-INVALID",
        slug: "test-invalid",
        make: "Skoda",
        model: "Octavia",
        status: "published",
      }),
      (error: unknown) => error instanceof ZodError,
    );
    await assert.rejects(
      mutations.createDraftVehicle({
        stockNumber: "TEST-DUPLICATE",
        slug: "test-duplicate",
        make: "Skoda",
        model: "Octavia",
        mediaAssetIds: ["same-image", "same-image"],
      }),
      (error: unknown) => error instanceof ZodError,
    );
    await assert.rejects(
      mutations.createDraftVehicle({
        stockNumber: "TEST-FLOAT",
        slug: "test-float",
        make: "Skoda",
        model: "Octavia",
        price: 99.95,
      }),
      (error: unknown) => error instanceof ZodError,
    );
    await assert.rejects(
      mutations.createDraftVehicle({
        stockNumber: "TEST-CONSUMPTION",
        slug: "test-consumption",
        make: "Skoda",
        model: "Octavia",
        fuelType: "petrol",
        consumption: "5.2",
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryMutationError" &&
        "status" in error &&
        error.status === 422,
    );
    assert.equal(
      await prisma.vehicle.count({ where: { createdById: actorId } }),
      0,
    );
  });

  it("creates a minimal draft with ordered private images and initial history", async () => {
    session = { user: { id: actorId, role: "user" } };
    const first = await createImageAsset();
    const second = await createImageAsset();

    const saved = await createDraft([second, first]);
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: saved.vehicleId },
    });
    const staffDTO = await queries.getStaffVehicle(saved.vehicleId);
    const attachments = await prisma.vehicleMedia.findMany({
      where: { vehicleId: saved.vehicleId },
      orderBy: { position: "asc" },
    });
    const history = await prisma.vehicleChange.findMany({
      where: { vehicleId: saved.vehicleId },
      orderBy: { version: "asc" },
    });

    assert.deepEqual(saved.mediaAssetIds, [second, first]);
    assert.deepEqual(staffDTO?.mediaAssetIds, [second, first]);
    assert.equal(saved.version, 1);
    assert.deepEqual(
      attachments.map(({ mediaAssetId, position }) => [mediaAssetId, position]),
      [
        [second, 0],
        [first, 1],
      ],
    );
    assert.equal(vehicle.status, "draft");
    assert.equal(vehicle.inspectionStatus, "pending");
    assert.equal(vehicle.isFeatured, false);
    assert.equal(vehicle.dealerId, dealerId);
    assert.equal(vehicle.createdById, actorId);
    assert.equal(vehicle.price, null);
    assert.equal(vehicle.description, null);
    assert.equal(
      vehicle.acquisitionDate.toISOString().slice(0, 10),
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Vienna",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    );
    assert.deepEqual(
      history.map(
        ({ version, previousStatus, status, actorId: changeActor }) => [
          version,
          previousStatus,
          status,
          changeActor,
        ],
      ),
      [[1, null, "draft", actorId]],
    );
    assert.deepEqual(
      await prisma.mediaAsset.findMany({
        where: { id: { in: [first, second] } },
        orderBy: { id: "asc" },
        select: { id: true, bucketAccess: true, publicApprovedAt: true },
      }),
      [first, second].sort().map((id) => ({
        id,
        bucketAccess: "private",
        publicApprovedAt: null,
      })),
    );
  });

  it("reorders media with an optimistic draft update and rejects stale versions", async () => {
    const first = await createImageAsset();
    const second = await createImageAsset();
    const created = await createDraft([first, second]);

    const updated = await mutations.updateDraftVehicle({
      vehicleId: created.vehicleId,
      expectedVersion: 1,
      make: "Škoda",
      fuelType: "electric",
      consumption: "18.5",
      consumptionUnit: "kwh_per_100_km",
      mediaAssetIds: [second, first],
    });
    assert.equal(updated.version, 2);
    assert.deepEqual(updated.mediaAssetIds, [second, first]);
    assert.equal(
      (
        await prisma.vehicle.findUniqueOrThrow({
          where: { id: created.vehicleId },
        })
      ).make,
      "Škoda",
    );
    assert.equal(
      (
        await prisma.vehicle.findUniqueOrThrow({
          where: { id: created.vehicleId },
        })
      ).consumption?.toFixed(2),
      "18.50",
    );

    await assert.rejects(
      mutations.updateDraftVehicle({
        vehicleId: created.vehicleId,
        expectedVersion: 1,
        make: "Stale edit",
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryMutationError" &&
        "status" in error &&
        error.status === 409,
    );
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: created.vehicleId },
    });
    assert.equal(vehicle.make, "Škoda");
    assert.equal(vehicle.version, 2);
    assert.equal(
      await prisma.vehicleChange.count({
        where: { vehicleId: created.vehicleId },
      }),
      2,
    );
  });

  it("rejects unavailable assets without changing the draft", async () => {
    const created = await createDraft();
    const unfinishedId = randomUUID();
    await prisma.mediaUploadIntent.create({
      data: {
        id: unfinishedId,
        objectKey: `assets/${unfinishedId}.png`,
        stagingKey: `incoming/${unfinishedId}`,
        type: "image",
        title: "Unfinished image",
        originalFilename: "unfinished.png",
        claimedMimeType: "image/png",
        sizeBytes: BigInt(imageBytes.length),
        uploadedById: actorId,
        expiresAt: new Date(Date.now() + 60_000),
      },
    });
    const nonImage = await createImageAsset({ type: "document" });
    const missingObject = await createImageAsset({ putObject: false });

    for (const assetIds of [
      [randomUUID()],
      [unfinishedId],
      [nonImage],
      [missingObject],
    ]) {
      await assert.rejects(
        mutations.updateDraftVehicle({
          vehicleId: created.vehicleId,
          expectedVersion: 1,
          make: "Must not persist",
          mediaAssetIds: assetIds,
        }),
        (error: unknown) =>
          error instanceof Error && error.name === "InventoryMutationError",
      );
    }

    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: created.vehicleId },
    });
    assert.equal(vehicle.make, "Skoda");
    assert.equal(vehicle.version, 1);
    assert.equal(
      await prisma.vehicleChange.count({
        where: { vehicleId: created.vehicleId },
      }),
      1,
    );
    assert.equal(
      await prisma.vehicleMedia.count({
        where: { vehicleId: created.vehicleId },
      }),
      0,
    );
  });

  it("rejects an image already attached to another vehicle", async () => {
    const imageId = await createImageAsset();
    const first = await createDraft([imageId]);
    const second = await createDraft();

    await assert.rejects(
      mutations.updateDraftVehicle({
        vehicleId: second.vehicleId,
        expectedVersion: 1,
        mediaAssetIds: [imageId],
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryMutationError" &&
        "status" in error &&
        error.status === 409,
    );
    assert.equal(
      await prisma.vehicleMedia.count({
        where: { vehicleId: first.vehicleId },
      }),
      1,
    );
    assert.equal(
      await prisma.vehicleMedia.count({
        where: { vehicleId: second.vehicleId },
      }),
      0,
    );
  });

  it("rolls back vehicle, history, and media changes when attachment insertion fails", async () => {
    const originalImage = await createImageAsset();
    const rejectedImage = await createImageAsset();
    const created = await createDraft([originalImage]);

    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION "test_fail_vehicle_media_fn"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."mediaAssetId" = '${rejectedImage}' THEN
          RAISE EXCEPTION 'intentional vehicle media test failure';
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "test_fail_vehicle_media"
      BEFORE INSERT ON "VehicleMedia"
      FOR EACH ROW EXECUTE FUNCTION "test_fail_vehicle_media_fn"();
    `);
    triggerInstalled = true;

    await assert.rejects(
      mutations.updateDraftVehicle({
        vehicleId: created.vehicleId,
        expectedVersion: 1,
        make: "Must roll back",
        mediaAssetIds: [rejectedImage],
      }),
    );
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: created.vehicleId },
    });
    assert.equal(vehicle.make, "Skoda");
    assert.equal(vehicle.version, 1);
    assert.deepEqual(
      await prisma.vehicleMedia.findMany({
        where: { vehicleId: created.vehicleId },
        select: { mediaAssetId: true, position: true },
      }),
      [{ mediaAssetId: originalImage, position: 0 }],
    );
    assert.equal(
      await prisma.vehicleChange.count({
        where: { vehicleId: created.vehicleId },
      }),
      1,
    );
  });
});
