import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { after, before, describe, it, mock } from "node:test";
import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Pool } from "@neondatabase/serverless";
import {
  assertAuthenticatedSession,
  type AuthSession,
} from "../src/lib/auth-access.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
} from "../src/lib/media-storage.ts";
import { createMediaTestDatabase } from "./media-test-client.ts";

const { prisma, connectionString } = createMediaTestDatabase();
const userId = randomUUID();
const createdIds = new Set<string>();
const uploadIds = new Set<string>();
let dealerId: string | undefined;
let session: (AuthSession & { user: { id: string; role: string } }) | null = {
  user: { id: userId, role: "user" },
};
let uploads: typeof import("../src/lib/vehicle-photo-uploads.ts");
let mutations: typeof import("../src/lib/inventory-mutations.ts");
let gallery: typeof import("../src/lib/vehicle-photos.ts");

const s3 = getMediaStorageClient();
const Bucket = getPrivateMediaBucket();
assert.equal(
  new URL(process.env.AWS_ENDPOINT_URL_S3 ?? "").hostname,
  "br-raspy-mud-bdgl35v3.storage.c-8.us-east-2.aws.neon.tech",
  "Verify and use only the isolated vehicle photo storage branch.",
);
assert.equal(Bucket, "media-private");

const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jfJkAAAAASUVORK5CYII=",
    "base64",
  ),
);

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
  if (result.error) throw result.error;
  const output = `${result.stdout}\n${result.stderr}`.replaceAll(
    connectionString,
    "<test connection>",
  );
  assert.equal(result.status, 0, output);
}

async function prepare(files: Uint8Array<ArrayBuffer>[], vehicleId?: string) {
  const result = await uploads.createPhotoUploads({
    vehicleId,
    files: files.map((bytes) => ({
      contentType: "image/png",
      sizeBytes: bytes.length,
    })),
  });
  for (const grant of result.uploads) uploadIds.add(grant.uploadId);
  return result.uploads;
}

async function post(
  grant: Awaited<ReturnType<typeof prepare>>[number],
  bytes: Uint8Array<ArrayBuffer>,
) {
  const form = new FormData();
  for (const [field, value] of Object.entries(grant.fields))
    form.append(field, value);
  form.append("file", new Blob([bytes], { type: "image/png" }), "photo.png");
  const response = await fetch(grant.url, { method: "POST", body: form });
  assert.ok(response.ok, `Object storage upload returned ${response.status}`);
}

async function verifyMissingObject(id: string) {
  await assert.rejects(
    s3.send(
      new HeadObjectCommand({ Bucket, Key: uploads.uploadedPhotoKey(id) }),
    ),
    uploads.isMissingPhotoObject,
  );
}

describe("vehicle-owned photos on isolated Neon resources", () => {
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
    mock.module("../src/lib/db.ts", { namedExports: { prisma } });
    mock.module("../src/lib/session.ts", {
      namedExports: {
        requireSession: async () => assertAuthenticatedSession(session),
      },
    });
    uploads = await import("../src/lib/vehicle-photo-uploads.ts");
    mutations = await import("../src/lib/inventory-mutations.ts");
    gallery = await import("../src/lib/vehicle-photos.ts");
    assert.ok(
      (await prisma.dealer.count()) <= 1,
      "Use a clean isolated test database.",
    );
    if ((await prisma.dealer.count()) === 0) {
      dealerId = (
        await prisma.dealer.create({
          data: { name: "Synthetic photo testing" },
        })
      ).id;
    }
    await prisma.user.create({
      data: {
        id: userId,
        name: "Synthetic ordinary staff",
        email: `${userId}@example.invalid`,
        role: "user",
      },
    });
  });

  after(async () => {
    try {
      await prisma.vehicleChange.deleteMany({
        where: { vehicleId: { in: [...createdIds] } },
      });
      await prisma.vehicle.deleteMany({
        where: { id: { in: [...createdIds] } },
      });
      await prisma.vehiclePhotoUpload.deleteMany({
        where: { id: { in: [...uploadIds] } },
      });
      for (const uploadId of uploadIds) {
        const key = uploads.uploadedPhotoKey(uploadId);
        await prisma.vehiclePhotoDeletion.deleteMany({
          where: { objectKey: key },
        });
        for (const Key of [key, `vehicle-photos/incoming/${uploadId}`]) {
          await s3.send(new DeleteObjectCommand({ Bucket, Key }));
        }
      }
      if (dealerId) await prisma.dealer.delete({ where: { id: dealerId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    } finally {
      mock.restoreAll();
      await prisma.$disconnect();
    }
  });

  it("backfills existing private and public links before retiring legacy tables", async () => {
    const pool = new Pool({ connectionString });
    const connection = await pool.connect();
    const sql = (name: string) =>
      readFileSync(
        new URL(`./migrations/${name}/migration.sql`, import.meta.url),
        "utf8",
      ).replace(/^\s*BEGIN;\s*|\s*COMMIT;\s*$/g, "");
    try {
      await connection.query("BEGIN");
      await connection.query(`
        CREATE SCHEMA vehicle_photo_migration_regression;
        SET LOCAL search_path = vehicle_photo_migration_regression;
        CREATE TABLE "Vehicle" ("id" text PRIMARY KEY);
        CREATE TYPE "MediaAssetType" AS ENUM ('image');
        CREATE TYPE "MediaBucketAccess" AS ENUM ('private', 'public_read');
        CREATE TABLE "MediaAsset" ("id" text PRIMARY KEY, "bucketAccess" "MediaBucketAccess", "objectKey" text,
          "altText" text, "verifiedMimeType" text, "sizeBytes" bigint);
        CREATE TABLE "VehicleMedia" ("vehicleId" text, "mediaAssetId" text, "position" smallint);
        CREATE TABLE "MediaUploadIntent" ("expiresAt" timestamptz, "cancelledAt" timestamptz);
        CREATE FUNCTION "vehicle_media_image_only"() RETURNS int LANGUAGE sql AS 'SELECT 1';
        CREATE FUNCTION "media_asset_vehicle_type_immutable"() RETURNS int LANGUAGE sql AS 'SELECT 1';
        CREATE FUNCTION "media_asset_storage_identity_immutable"() RETURNS int LANGUAGE sql AS 'SELECT 1';
        INSERT INTO "Vehicle" VALUES ('vehicle1');
        INSERT INTO "MediaAsset" VALUES
          ('private-id', 'private', 'assets/private.jpg', 'Front', 'image/jpeg', 2000),
          ('public-id', 'public_read', 'approved/front.jpg', NULL, 'image/jpeg', 2000),
          ('unattached-id', 'private', 'assets/unattached.jpg', NULL, 'image/jpeg', 2000);
        INSERT INTO "VehicleMedia" VALUES ('vehicle1', 'private-id', 1), ('vehicle1', 'public-id', 0);
      `);
      await connection.query(sql("20261127100000_backfill_vehicle_photos"));
      await connection.query("SAVEPOINT drift_probe");
      await connection.query(
        `UPDATE "VehicleMedia" SET "position" = 2 WHERE "mediaAssetId" = 'public-id'`,
      );
      await assert.rejects(
        connection.query(sql("20261127110000_retire_legacy_media")),
        /differs from the frozen legacy associations/,
      );
      await connection.query("ROLLBACK TO SAVEPOINT drift_probe");
      await connection.query(sql("20261127110000_retire_legacy_media"));
      assert.deepEqual(
        (
          await connection.query(`
        SELECT "id", "vehicleId", "position", "objectKey", "altText"
        FROM "VehiclePhoto" ORDER BY "position"
      `)
        ).rows,
        [
          {
            id: "public-id",
            vehicleId: "vehicle1",
            position: 0,
            objectKey: "photo-migration/public-id",
            altText: null,
          },
          {
            id: "private-id",
            vehicleId: "vehicle1",
            position: 1,
            objectKey: "assets/private.jpg",
            altText: "Front",
          },
        ],
      );
      assert.deepEqual(
        (await connection.query(`SELECT "id" FROM "Vehicle"`)).rows,
        [{ id: "vehicle1" }],
      );
      assert.equal(
        (await connection.query(`SELECT to_regclass('"MediaAsset"') AS gone`))
          .rows[0].gone,
        null,
      );
    } finally {
      await connection.query("ROLLBACK");
      connection.release();
      await pool.end();
    }
  });

  it("saves, reorders, removes, publishes and withdraws ordinary staff photos", async () => {
    const [first, second] = await prepare([png, png]);
    for (const grant of [first, second]) {
      await post(grant, png);
      assert.deepEqual(
        await uploads.completePhotoUpload({ uploadId: grant.uploadId }),
        { id: grant.uploadId },
      );
    }
    const slug = `photo-test-${randomUUID()}`;
    const fields = {
      stockNumber: slug,
      slug,
      make: "Synthetic",
      model: "Vehicle",
    };
    const draft = await mutations.createDraftVehicle({
      ...fields,
      photoIds: [first.uploadId, second.uploadId],
    });
    createdIds.add(draft.vehicleId);
    assert.deepEqual(
      (await gallery.listStaffVehiclePhotos(draft.vehicleId)).map(
        ({ id }) => id,
      ),
      [first.uploadId, second.uploadId],
    );
    assert.deepEqual(
      await gallery.listPublicVehiclePhotos(draft.vehicleId),
      [],
    );
    assert.equal(
      (await gallery.serveVehiclePhoto(first.uploadId, "public")).status,
      404,
    );
    session = null;
    assert.equal(
      (await gallery.serveVehiclePhoto(first.uploadId, "staff")).status,
      401,
    );
    await assert.rejects(prepare([png]), /authentication|sign in/i);
    session = { user: { id: userId, role: "user" } };
    const staffPhoto = await gallery.serveVehiclePhoto(first.uploadId, "staff");
    assert.equal(staffPhoto.status, 200);
    assert.deepEqual(new Uint8Array(await staffPhoto.arrayBuffer()), png);

    const [third] = await prepare([png], draft.vehicleId);
    await post(third, png);
    await uploads.completePhotoUpload({ uploadId: third.uploadId });
    await assert.rejects(
      mutations.updateVehicle({
        vehicleId: draft.vehicleId,
        expectedVersion: draft.version,
        photoIds: [third.uploadId, randomUUID()],
      }),
      /no longer available/,
    );
    assert.deepEqual(
      (await gallery.listStaffVehiclePhotos(draft.vehicleId)).map(
        ({ id }) => id,
      ),
      [first.uploadId, second.uploadId],
    );
    assert.equal(
      (
        await prisma.vehiclePhotoUpload.findUniqueOrThrow({
          where: { id: third.uploadId },
        })
      ).claimedAt,
      null,
    );
    const updated = await mutations.updateVehicle({
      vehicleId: draft.vehicleId,
      expectedVersion: draft.version,
      photoIds: [third.uploadId, first.uploadId],
    });
    await verifyMissingObject(second.uploadId);
    assert.deepEqual(
      (await gallery.listStaffVehiclePhotos(draft.vehicleId)).map(
        ({ id }) => id,
      ),
      [third.uploadId, first.uploadId],
    );

    const publication = {
      ...fields,
      vehicleId: draft.vehicleId,
      expectedVersion: updated.version,
      photoIds: updated.photoIds,
      inspectionStatus: "passed",
      price: "19999.00",
      firstRegistration: "2020-05",
      mileage: 46000,
      powerKw: "100.00",
      fuelType: "petrol",
      transmissionType: "manual",
      bodyType: "sedan",
      condition: "used",
      location: "Vienna",
      description: "Synthetic description for an isolated test vehicle.",
    };
    await assert.rejects(
      mutations.publishVehicle({ ...publication, inspectionStatus: "failed" }),
      /Set Inspection to Passed before publishing/,
    );
    const published = await mutations.publishVehicle(publication);
    assert.deepEqual(
      (await gallery.listPublicVehiclePhotos(draft.vehicleId)).map(
        ({ id }) => id,
      ),
      updated.photoIds,
    );
    assert.equal(
      (await gallery.listPublicVehicleCardImages([draft.vehicleId])).get(
        draft.vehicleId,
      )?.[0].id,
      third.uploadId,
    );
    const publicPhoto = await gallery.serveVehiclePhoto(
      third.uploadId,
      "public",
    );
    assert.equal(publicPhoto.status, 200);
    assert.match(publicPhoto.headers.get("cache-control") ?? "", /no-store/);
    await publicPhoto.arrayBuffer();
    const withdrawn = await mutations.updateVehicle({
      vehicleId: draft.vehicleId,
      expectedVersion: published.version,
      inspectionStatus: "failed",
    });
    assert.equal(withdrawn.withdrawn, true);
    assert.equal(
      (await gallery.serveVehiclePhoto(third.uploadId, "public")).status,
      404,
    );
    const saved = await prisma.vehicle.findUniqueOrThrow({
      where: { id: draft.vehicleId },
    });
    assert.equal(saved.status, "draft");
    assert.equal(saved.inspectionStatus, "failed");
    assert.equal(saved.isFeatured, false);
    assert.equal(
      (await gallery.listStaffVehiclePhotos(draft.vehicleId)).length,
      2,
    );
  });

  it("rejects a fake photo and cleans an uploaded photo discarded before save", async () => {
    const bad = new Uint8Array(png.length);
    const [invalid, discarded] = await prepare([bad, png]);
    await post(invalid, bad);
    await assert.rejects(
      uploads.completePhotoUpload({ uploadId: invalid.uploadId }),
      /must be a JPEG or PNG/,
    );
    await post(discarded, png);
    await uploads.completePhotoUpload({ uploadId: discarded.uploadId });
    await uploads.cancelPhotoUpload({ uploadId: discarded.uploadId });
    await verifyMissingObject(discarded.uploadId);
    await assert.rejects(
      mutations.createDraftVehicle({
        stockNumber: randomUUID(),
        slug: randomUUID(),
        make: "Synthetic",
        model: "Cancelled upload",
        photoIds: [discarded.uploadId],
      }),
      /no longer available/,
    );
    assert.equal(
      await prisma.vehiclePhoto.count({ where: { id: discarded.uploadId } }),
      0,
    );
  });
});
