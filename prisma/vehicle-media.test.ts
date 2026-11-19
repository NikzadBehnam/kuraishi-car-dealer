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
  getPublicMediaBucket,
} from "../src/lib/media-storage.ts";
import { ZodError } from "zod";
import { createMediaTestDatabase } from "./media-test-client.ts";

const { prisma, connectionString } = createMediaTestDatabase();
const s3 = getMediaStorageClient();
const bucket = getPrivateMediaBucket();
const publicBucket = getPublicMediaBucket();
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
let mediaAttachments: typeof import("../src/lib/media-attachments.ts");
let triggerInstalled = false;
const objectKeys: { Bucket: string; Key: string }[] = [];

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
  publicRead = false,
}: {
  type?: "image" | "document";
  putObject?: boolean;
  publicRead?: boolean;
} = {}) {
  const id = randomUUID();
  const objectKey = `assets/test-${id}.png`;
  const assetBucket = publicRead ? publicBucket : bucket;
  if (putObject) {
    await s3.send(
      new PutObjectCommand({
        Bucket: assetBucket,
        Key: objectKey,
        Body: imageBytes,
        ContentType: "image/png",
      }),
    );
    objectKeys.push({ Bucket: assetBucket, Key: objectKey });
  }
  await prisma.mediaAsset.create({
    data: {
      id,
      objectKey,
      bucketAccess: publicRead ? "public_read" : "private",
      type,
      title: "Test image",
      originalFilename: "test.png",
      verifiedMimeType: type === "image" ? "image/png" : "application/pdf",
      sizeBytes: BigInt(imageBytes.length),
      uploadedById: actorId,
      ...(publicRead
        ? { publicApprovedAt: new Date(), publicApprovedById: actorId }
        : {}),
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

function publishInput(overrides: Record<string, unknown> = {}) {
  const suffix = randomUUID();
  return {
    stockNumber: `PUBLISH-${suffix.slice(0, 8).toUpperCase()}`,
    slug: `publish-${suffix}`,
    make: "Skoda",
    model: "Octavia",
    description:
      "A carefully maintained vehicle with complete listing details.",
    location: "Vienna",
    condition: "used",
    price: "24900.00",
    firstRegistration: "2020-05",
    mileage: 45000,
    powerKw: "110",
    fuelType: "petrol",
    transmissionType: "automatic",
    bodyType: "wagon",
    mediaAssetIds: [],
    confirmInspectionPassed: true,
    ...overrides,
  };
}

describe("vehicle media persistence on isolated Neon resources", () => {
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
    mediaAttachments = await import("../src/lib/media-attachments.ts");
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
      for (const object of objectKeys) {
        await s3.send(new DeleteObjectCommand(object));
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
    await assert.rejects(
      mutations.transitionVehicleLifecycle({ invalid: true }),
      (error: unknown) =>
        error instanceof Error && error.name === "AuthorizationError",
    );
    await assert.rejects(
      mediaAttachments.listVehicleMediaAssets("vehicle_1"),
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

  it("revalidates required fields, descriptions, enums, numbers, dates, VINs, and media input", async () => {
    session = { user: { id: actorId, role: "user" } };
    const invalidFields: Record<string, unknown>[] = [
      { stockNumber: " " },
      { slug: " " },
      { make: " " },
      { description: "Too short" },
      { condition: "certified" },
      { fuelType: "steam" },
      { price: "-1" },
      { price: "NaN" },
      { marginEstimate: "-0.01" },
      { powerKw: "0" },
      { mileage: 1.5 },
      { ownerCount: Number.POSITIVE_INFINITY },
      { co2Emission: -1 },
      { firstRegistration: "1885-12" },
      { firstRegistration: "9999-12" },
      { firstRegistration: "2024-13" },
      { vinLastSix: "12345" },
      { mediaAssetIds: ["../private"] },
      { imageUrls: ["https://example.invalid/car.jpg"] },
    ];

    for (const [index, fields] of invalidFields.entries()) {
      await assert.rejects(
        mutations.createDraftVehicle({
          stockNumber: `TEST-VALIDATION-${index}`,
          slug: `test-validation-${index}`,
          make: "Skoda",
          model: "Octavia",
          ...fields,
        }),
        (error: unknown) => error instanceof ZodError,
      );
    }

    assert.equal(
      await prisma.vehicle.count({ where: { createdById: actorId } }),
      0,
    );
  });

  it("accepts a minimum-length description and the current registration month", async () => {
    session = { user: { id: actorId, role: "user" } };
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Europe/Vienna",
      year: "numeric",
      month: "2-digit",
    }).formatToParts(new Date());
    const year = parts.find(({ type }) => type === "year")?.value;
    const month = parts.find(({ type }) => type === "month")?.value;
    assert.ok(year && month);
    const firstRegistration = `${year}-${month}`;
    const description = "12345678901234567890";
    const saved = await mutations.createDraftVehicle({
      stockNumber: `TEST-VALID-${randomUUID().slice(0, 8)}`,
      slug: `test-valid-${randomUUID().slice(0, 8)}`,
      make: "Skoda",
      model: "Octavia",
      description,
      firstRegistration,
      vinLastSix: "ABC123",
    });
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: saved.vehicleId },
    });

    assert.equal(vehicle.description, description);
    assert.equal(vehicle.firstRegistration, firstRegistration);
    assert.equal(vehicle.vinLastSix, "ABC123");
  });

  it("accepts approved public media IDs and attaches them in order", async () => {
    session = { user: { id: actorId, role: "user" } };
    const imageId = await createImageAsset({ publicRead: true });
    const saved = await createDraft([imageId]);
    const asset = await prisma.mediaAsset.findUniqueOrThrow({
      where: { id: imageId },
      select: {
        bucketAccess: true,
        publicApprovedAt: true,
        publicApprovedById: true,
      },
    });

    assert.deepEqual(saved.mediaAssetIds, [imageId]);
    assert.equal(asset.bucketAccess, "public_read");
    assert.ok(asset.publicApprovedAt);
    assert.equal(asset.publicApprovedById, actorId);
  });

  it("requires complete listing fields and explicit inspection confirmation", async () => {
    session = { user: { id: actorId, role: "user" } };
    const invalidFields: Record<string, unknown>[] = [
      { price: null },
      { firstRegistration: null },
      { mileage: null },
      { powerKw: null },
      { fuelType: null },
      { transmissionType: null },
      { bodyType: null },
      { condition: null },
      { location: null },
      { description: "Too short" },
      { confirmInspectionPassed: false },
      { expectedVersion: 1 },
    ];
    const countBefore = await prisma.vehicle.count({
      where: { createdById: actorId },
    });

    for (const fields of invalidFields) {
      await assert.rejects(
        mutations.publishVehicle(publishInput(fields)),
        (error: unknown) => error instanceof ZodError,
      );
    }

    assert.equal(
      await prisma.vehicle.count({ where: { createdById: actorId } }),
      countBefore,
    );
  });

  it("atomically creates a complete published vehicle with approved ordered media", async () => {
    session = { user: { id: actorId, role: "user" } };
    const imageId = await createImageAsset({ publicRead: true });
    const input = publishInput({ mediaAssetIds: [imageId] });
    const saved = await mutations.publishVehicle(input);
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: saved.vehicleId },
    });
    const history = await prisma.vehicleChange.findMany({
      where: { vehicleId: saved.vehicleId },
      orderBy: { version: "asc" },
    });

    assert.equal(saved.created, true);
    assert.equal(saved.version, 1);
    assert.equal(vehicle.status, "published");
    assert.equal(vehicle.inspectionStatus, "passed");
    assert.equal(vehicle.isFeatured, false);
    assert.ok(vehicle.publishedAt);
    assert.equal(vehicle.price?.toFixed(2), "24900.00");
    assert.deepEqual(saved.mediaAssetIds, [imageId]);
    const publicMediaPreview = await mediaAttachments.listVehicleMediaAssets(
      saved.vehicleId,
    );
    assert.equal(publicMediaPreview.assets[0]?.isPublicApproved, true);
    assert.deepEqual(
      history.map(({ previousStatus, status, inspectionStatus }) => ({
        previousStatus,
        status,
        inspectionStatus,
      })),
      [
        {
          previousStatus: null,
          status: "published",
          inspectionStatus: "passed",
        },
      ],
    );
  });

  it("rejects publishing with private images or no approved image", async () => {
    session = { user: { id: actorId, role: "user" } };
    const privateImageId = await createImageAsset();
    const countBefore = await prisma.vehicle.count({
      where: { createdById: actorId },
    });

    for (const mediaAssetIds of [[], [privateImageId]]) {
      await assert.rejects(
        mutations.publishVehicle(publishInput({ mediaAssetIds })),
        (error: unknown) =>
          error instanceof Error &&
          error.name === "InventoryPolicyError" &&
          "status" in error &&
          error.status === 422,
      );
    }

    assert.equal(
      await prisma.vehicle.count({ where: { createdById: actorId } }),
      countBefore,
    );
  });

  it("publishes an existing draft with an optimistic version and rejects repeat publishing", async () => {
    session = { user: { id: actorId, role: "user" } };
    const imageId = await createImageAsset({ publicRead: true });
    const draft = await createDraft([imageId]);
    const current = await prisma.vehicle.findUniqueOrThrow({
      where: { id: draft.vehicleId },
      select: { stockNumber: true, slug: true },
    });
    const input = publishInput({
      vehicleId: draft.vehicleId,
      expectedVersion: draft.version,
      stockNumber: current.stockNumber,
      slug: current.slug,
      make: "Published Skoda",
      mediaAssetIds: [imageId],
    });
    const saved = await mutations.publishVehicle(input);
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: draft.vehicleId },
    });

    assert.equal(saved.created, false);
    assert.equal(saved.version, draft.version + 1);
    assert.equal(vehicle.make, "Published Skoda");
    assert.equal(vehicle.status, "published");
    assert.equal(vehicle.inspectionStatus, "passed");
    assert.ok(vehicle.publishedAt);
    await assert.rejects(
      mutations.publishVehicle({
        ...input,
        expectedVersion: saved.version,
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryMutationError" &&
        "status" in error &&
        error.status === 409,
    );
    await assert.rejects(
      mutations.publishVehicle(input),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryMutationError" &&
        "status" in error &&
        error.status === 409,
    );
  });

  it("marks a reserved vehicle sold, is idempotent, and archives it with history", async () => {
    session = { user: { id: actorId, role: "user" } };
    const imageId = await createImageAsset({ publicRead: true });
    const draft = await createDraft([imageId]);
    await assert.rejects(
      mutations.transitionVehicleLifecycle({
        vehicleId: draft.vehicleId,
        expectedVersion: draft.version,
        status: "sold",
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryPolicyError" &&
        "status" in error &&
        error.status === 409,
    );
    const initial = await prisma.vehicle.findUniqueOrThrow({
      where: { id: draft.vehicleId },
      select: { stockNumber: true, slug: true },
    });
    const published = await mutations.publishVehicle(
      publishInput({
        vehicleId: draft.vehicleId,
        expectedVersion: draft.version,
        stockNumber: initial.stockNumber,
        slug: initial.slug,
        mediaAssetIds: [imageId],
      }),
    );
    const reservedUntil = new Date("2026-02-01T10:00:00.000Z");
    await prisma.vehicle.update({
      where: { id: draft.vehicleId },
      data: { status: "reserved", reservedUntil },
    });

    const sold = await mutations.transitionVehicleLifecycle({
      vehicleId: draft.vehicleId,
      expectedVersion: published.version,
      status: "sold",
    });
    assert.equal(sold.changed, true);
    assert.equal(sold.status, "sold");
    assert.equal(sold.version, published.version + 1);
    assert.ok(sold.soldAt);

    const repeatedSale = await mutations.transitionVehicleLifecycle({
      vehicleId: draft.vehicleId,
      expectedVersion: sold.version,
      status: "sold",
    });
    assert.equal(repeatedSale.changed, false);
    assert.equal(repeatedSale.version, sold.version);
    assert.equal(repeatedSale.soldAt, sold.soldAt);

    const archived = await mutations.transitionVehicleLifecycle({
      vehicleId: draft.vehicleId,
      expectedVersion: sold.version,
      status: "archived",
    });
    assert.equal(archived.changed, true);
    assert.equal(archived.status, "archived");
    assert.equal(archived.version, sold.version + 1);
    assert.equal(archived.soldAt, sold.soldAt);

    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: draft.vehicleId },
    });
    assert.equal(vehicle.status, "archived");
    assert.equal(vehicle.reservedUntil, null);
    assert.equal(vehicle.soldAt?.toISOString(), sold.soldAt);
    assert.equal(vehicle.isFeatured, false);
    assert.deepEqual(
      await prisma.vehicleChange.findMany({
        where: {
          vehicleId: draft.vehicleId,
          version: { gt: published.version },
        },
        orderBy: { version: "asc" },
        select: {
          version: true,
          previousStatus: true,
          status: true,
          previousSoldAt: true,
          soldAt: true,
        },
      }),
      [
        {
          version: sold.version,
          previousStatus: "reserved",
          status: "sold",
          previousSoldAt: null,
          soldAt: new Date(sold.soldAt!),
        },
        {
          version: archived.version,
          previousStatus: "sold",
          status: "archived",
          previousSoldAt: new Date(sold.soldAt!),
          soldAt: new Date(sold.soldAt!),
        },
      ],
    );
  });

  it("rejects stale lifecycle changes and requires an approved image before sale", async () => {
    session = { user: { id: actorId, role: "user" } };
    const draft = await createDraft();
    await assert.rejects(
      mutations.transitionVehicleLifecycle({
        vehicleId: draft.vehicleId,
        expectedVersion: draft.version,
        status: "sold",
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryMutationError" &&
        "status" in error &&
        error.status === 422,
    );
    await assert.rejects(
      mutations.transitionVehicleLifecycle({
        vehicleId: draft.vehicleId,
        expectedVersion: draft.version + 1,
        status: "archived",
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryMutationError" &&
        "status" in error &&
        error.status === 409,
    );

    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: draft.vehicleId },
    });
    assert.equal(vehicle.status, "draft");
    assert.equal(vehicle.version, draft.version);
    assert.equal(vehicle.soldAt, null);
  });

  it("clears featured when archiving a published vehicle", async () => {
    session = { user: { id: actorId, role: "user" } };
    const imageId = await createImageAsset({ publicRead: true });
    const draft = await createDraft([imageId]);
    const initial = await prisma.vehicle.findUniqueOrThrow({
      where: { id: draft.vehicleId },
      select: { stockNumber: true, slug: true },
    });
    const published = await mutations.publishVehicle(
      publishInput({
        vehicleId: draft.vehicleId,
        expectedVersion: draft.version,
        stockNumber: initial.stockNumber,
        slug: initial.slug,
        mediaAssetIds: [imageId],
      }),
    );
    await prisma.vehicle.update({
      where: { id: draft.vehicleId },
      data: { isFeatured: true },
    });

    const archived = await mutations.transitionVehicleLifecycle({
      vehicleId: draft.vehicleId,
      expectedVersion: published.version,
      status: "archived",
    });
    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: draft.vehicleId },
    });

    assert.equal(archived.status, "archived");
    assert.equal(archived.soldAt, null);
    assert.equal(vehicle.isFeatured, false);
    assert.equal(vehicle.soldAt, null);
    assert.equal(vehicle.status, "archived");
    assert.equal(vehicle.version, published.version + 1);
  });

  it("rolls back a lifecycle update when its history insert fails", async () => {
    session = { user: { id: actorId, role: "user" } };
    const imageId = await createImageAsset({ publicRead: true });
    const draft = await createDraft([imageId]);
    const initial = await prisma.vehicle.findUniqueOrThrow({
      where: { id: draft.vehicleId },
      select: { stockNumber: true, slug: true },
    });
    const published = await mutations.publishVehicle(
      publishInput({
        vehicleId: draft.vehicleId,
        expectedVersion: draft.version,
        stockNumber: initial.stockNumber,
        slug: initial.slug,
        mediaAssetIds: [imageId],
      }),
    );
    const reservedUntil = new Date("2026-03-01T10:00:00.000Z");
    await prisma.vehicle.update({
      where: { id: draft.vehicleId },
      data: { status: "reserved", reservedUntil },
    });
    const triggerFunction = `"test_fail_vehicle_change_fn"`;
    const triggerName = `"test_fail_vehicle_change"`;

    try {
      await prisma.$executeRawUnsafe(`
        CREATE FUNCTION ${triggerFunction}() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
          IF NEW."status" = 'sold' THEN
            RAISE EXCEPTION 'intentional vehicle lifecycle test failure';
          END IF;
          RETURN NEW;
        END;
        $$;
      `);
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER ${triggerName}
        BEFORE INSERT ON "VehicleChange"
        FOR EACH ROW EXECUTE FUNCTION ${triggerFunction}();
      `);
      await assert.rejects(
        mutations.transitionVehicleLifecycle({
          vehicleId: draft.vehicleId,
          expectedVersion: published.version,
          status: "sold",
        }),
      );
    } finally {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS ${triggerName} ON "VehicleChange"`,
      );
      await prisma.$executeRawUnsafe(
        `DROP FUNCTION IF EXISTS ${triggerFunction}()`,
      );
    }

    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: draft.vehicleId },
    });
    assert.equal(vehicle.status, "reserved");
    assert.equal(vehicle.version, published.version);
    assert.equal(
      vehicle.reservedUntil?.toISOString(),
      reservedUntil.toISOString(),
    );
    assert.equal(vehicle.soldAt, null);
    assert.equal(
      await prisma.vehicleChange.count({
        where: { vehicleId: draft.vehicleId, version: published.version + 1 },
      }),
      0,
    );
  });

  it("returns conflicts when a stock number or slug already exists", async () => {
    session = { user: { id: actorId, role: "user" } };
    const saved = await createDraft();
    const existing = await prisma.vehicle.findUniqueOrThrow({
      where: { id: saved.vehicleId },
      select: { stockNumber: true, slug: true },
    });

    for (const duplicate of [
      {
        stockNumber: existing.stockNumber,
        slug: `unique-${randomUUID()}`,
      },
      {
        stockNumber: `TEST-${randomUUID().slice(0, 8)}`,
        slug: existing.slug,
      },
    ]) {
      await assert.rejects(
        mutations.createDraftVehicle({
          ...duplicate,
          make: "Skoda",
          model: "Octavia",
        }),
        (error: unknown) =>
          error instanceof Error &&
          error.name === "InventoryMutationError" &&
          "status" in error &&
          error.status === 409,
      );
    }
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
    const mediaPreviews = await mediaAttachments.listVehicleMediaAssets(
      saved.vehicleId,
    );
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
    assert.deepEqual(
      mediaPreviews.assets.map(({ id }) => id),
      [second, first],
    );
    assert.ok(
      mediaPreviews.assets.every(({ previewUrl }) =>
        previewUrl.startsWith("http"),
      ),
    );
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

    const updated = await mutations.updateVehicle({
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
      mutations.updateVehicle({
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

  it("detaches removed draft images without deleting the media assets", async () => {
    session = { user: { id: actorId, role: "user" } };
    const first = await createImageAsset();
    const second = await createImageAsset();
    const created = await createDraft([first, second]);

    const updated = await mutations.updateVehicle({
      vehicleId: created.vehicleId,
      expectedVersion: 1,
      mediaAssetIds: [second],
    });

    assert.deepEqual(updated.mediaAssetIds, [second]);
    assert.deepEqual(
      await prisma.vehicleMedia.findMany({
        where: { vehicleId: created.vehicleId },
        orderBy: { position: "asc" },
        select: { mediaAssetId: true, position: true },
      }),
      [{ mediaAssetId: second, position: 0 }],
    );
    assert.equal(await prisma.mediaAsset.count({ where: { id: first } }), 1);
  });

  it("updates every lifecycle status without changing it or its approved public media", async () => {
    session = { user: { id: actorId, role: "user" } };
    const publishedAt = new Date("2026-01-01T10:00:00.000Z");
    const cases = [
      { status: "published", isFeatured: true, hasPublicImage: true },
      { status: "reserved", isFeatured: false, hasPublicImage: true },
      { status: "sold", isFeatured: false, hasPublicImage: true },
      { status: "archived", isFeatured: false, hasPublicImage: false },
    ] as const;
    let publishedVehicle: { vehicleId: string; imageId: string } | undefined;

    for (const testCase of cases) {
      const imageId = testCase.hasPublicImage
        ? await createImageAsset({ publicRead: true })
        : undefined;
      const created = await createDraft(imageId ? [imageId] : []);
      await prisma.vehicle.update({
        where: { id: created.vehicleId },
        data: {
          status: testCase.status,
          inspectionStatus:
            testCase.status === "archived" ? "pending" : "passed",
          isFeatured: testCase.isFeatured,
          publishedAt: testCase.hasPublicImage ? publishedAt : null,
          soldAt: testCase.status === "sold" ? publishedAt : null,
        },
      });

      const updated = await mutations.updateVehicle({
        vehicleId: created.vehicleId,
        expectedVersion: 1,
        make: `Updated ${testCase.status}`,
        mediaAssetIds: imageId ? [imageId] : [],
      });
      const vehicle = await prisma.vehicle.findUniqueOrThrow({
        where: { id: created.vehicleId },
      });

      assert.equal(updated.version, 2);
      assert.equal(vehicle.version, 2);
      assert.equal(vehicle.status, testCase.status);
      assert.equal(
        vehicle.inspectionStatus,
        testCase.status === "archived" ? "pending" : "passed",
      );
      assert.equal(vehicle.isFeatured, testCase.isFeatured);
      assert.equal(vehicle.make, `Updated ${testCase.status}`);
      assert.equal(
        vehicle.publishedAt?.toISOString() ?? null,
        testCase.hasPublicImage ? publishedAt.toISOString() : null,
      );
      assert.equal(
        vehicle.soldAt?.toISOString() ?? null,
        testCase.status === "sold" ? publishedAt.toISOString() : null,
      );
      assert.deepEqual(updated.mediaAssetIds, imageId ? [imageId] : []);
      if (testCase.status === "published" && imageId) {
        publishedVehicle = { vehicleId: created.vehicleId, imageId };
      }
    }

    assert.ok(publishedVehicle);
    const privateImage = await createImageAsset();
    await assert.rejects(
      mutations.updateVehicle({
        vehicleId: publishedVehicle.vehicleId,
        expectedVersion: 2,
        mediaAssetIds: [],
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryMutationError" &&
        "status" in error &&
        error.status === 422,
    );
    await assert.rejects(
      mutations.updateVehicle({
        vehicleId: publishedVehicle.vehicleId,
        expectedVersion: 2,
        mediaAssetIds: [privateImage],
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryMutationError" &&
        "status" in error &&
        error.status === 422,
    );
    await assert.rejects(
      mutations.updateVehicle({
        vehicleId: publishedVehicle.vehicleId,
        expectedVersion: 2,
        slug: "changed-published-slug",
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryMutationError" &&
        "status" in error &&
        error.status === 422,
    );
    await assert.rejects(
      mutations.updateVehicle({
        vehicleId: publishedVehicle.vehicleId,
        expectedVersion: 1,
        make: "Stale edit",
      }),
      (error: unknown) =>
        error instanceof Error &&
        error.name === "InventoryMutationError" &&
        "status" in error &&
        error.status === 409,
    );

    const unchanged = await prisma.vehicle.findUniqueOrThrow({
      where: { id: publishedVehicle.vehicleId },
    });
    assert.equal(unchanged.version, 2);
    assert.equal(unchanged.make, "Updated published");
    assert.equal(
      await prisma.vehicleMedia.count({
        where: {
          vehicleId: publishedVehicle.vehicleId,
          mediaAssetId: publishedVehicle.imageId,
        },
      }),
      1,
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
        mutations.updateVehicle({
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
      mutations.updateVehicle({
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
    const rejectedImage = await createImageAsset({ publicRead: true });
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
      mutations.updateVehicle({
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

    const failedPublishSlug = `publish-rollback-${randomUUID()}`;
    await assert.rejects(
      mutations.publishVehicle(
        publishInput({
          slug: failedPublishSlug,
          mediaAssetIds: [rejectedImage],
        }),
      ),
    );
    assert.equal(
      await prisma.vehicle.count({ where: { slug: failedPublishSlug } }),
      0,
    );
    assert.equal(
      await prisma.vehicleChange.count({
        where: { vehicle: { slug: failedPublishSlug } },
      }),
      0,
    );
    assert.equal(
      await prisma.vehicleMedia.count({
        where: { mediaAssetId: rejectedImage },
      }),
      0,
    );
  });
});
