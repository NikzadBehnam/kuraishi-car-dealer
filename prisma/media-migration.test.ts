import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";

import { Prisma } from "../src/generated/prisma/client.ts";
import { createMediaTestDatabase } from "./media-test-client.ts";

const { prisma, connectionString } = createMediaTestDatabase();
const rollback = new Error("Roll back isolated test data.");

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

function hasPostgresCode(error: unknown, code: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code === "P2003") {
    return code === "23503";
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

async function withTestUploader(
  verify: (tx: Prisma.TransactionClient, uploaderId: string) => Promise<void>,
) {
  await assert.rejects(
    prisma.$transaction(
      async (tx) => {
        const uploader = await tx.user.create({
          data: {
            id: randomUUID(),
            name: "Media migration test",
            email: `${randomUUID()}@example.invalid`,
          },
        });
        await verify(tx, uploader.id);
        throw rollback;
      },
      { timeout: 60000 },
    ),
    (error: unknown) => error === rollback,
  );
}

async function createTestVehicle(
  tx: Prisma.TransactionClient,
  uploaderId: string,
  dealerId: string,
) {
  const id = randomUUID();
  return tx.vehicle.create({
    data: {
      id,
      slug: `test-${id}`,
      stockNumber: `TEST-${id.toUpperCase()}`,
      make: "Example",
      model: "Media",
      dealerId,
      createdById: uploaderId,
      updatedById: uploaderId,
      acquisitionDate: new Date("2026-11-18T00:00:00.000Z"),
    },
  });
}

async function withTestVehicle(
  verify: (
    tx: Prisma.TransactionClient,
    vehicleId: string,
    dealerId: string,
    uploaderId: string,
  ) => Promise<void>,
) {
  await withTestUploader(async (tx, uploaderId) => {
    const dealer = await tx.dealer.create({
      data: { name: "Media migration test dealership" },
    });
    const vehicle = await createTestVehicle(tx, uploaderId, dealer.id);
    await verify(tx, vehicle.id, dealer.id, uploaderId);
  });
}

async function expectConstraintViolationInTransaction(
  tx: Prisma.TransactionClient,
  code: string,
  operation: () => Promise<unknown>,
) {
  await tx.$executeRaw`SAVEPOINT media_constraint_case`;
  try {
    await assert.rejects(operation, (error: unknown) =>
      hasPostgresCode(error, code),
    );
  } finally {
    await tx.$executeRaw`ROLLBACK TO SAVEPOINT media_constraint_case`;
    await tx.$executeRaw`RELEASE SAVEPOINT media_constraint_case`;
  }
}

async function expectConstraintViolation(
  code: string,
  insert: (tx: Prisma.TransactionClient, uploaderId: string) => Promise<void>,
) {
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      const uploader = await tx.user.create({
        data: {
          id: randomUUID(),
          name: "Media constraint test",
          email: `${randomUUID()}@example.invalid`,
        },
      });
      await insert(tx, uploader.id);
    }),
    (error: unknown) => hasPostgresCode(error, code),
  );
}

describe("isolated media metadata migration", { concurrency: false }, () => {
  before(() => {
    runPrisma(["migrate", "deploy"]);
    runPrisma(["migrate", "deploy"]);
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
    await prisma.$disconnect();
  });

  it("stores private assets and explicitly approved public assets", async () => {
    await withTestUploader(async (tx, uploaderId) => {
      const privateAsset = await tx.mediaAsset.create({
        data: {
          objectKey: "private/documents/contract.pdf",
          bucketAccess: "private",
          type: "document",
          title: "Test contract",
          originalFilename: "contract.pdf",
          verifiedMimeType: "application/pdf",
          sizeBytes: BigInt(2048),
          uploadedById: uploaderId,
        },
      });
      const publicAsset = await tx.mediaAsset.create({
        data: {
          objectKey: "public/brand/logo.png",
          bucketAccess: "public_read",
          type: "brand",
          title: "Test logo",
          originalFilename: "logo.png",
          verifiedMimeType: "image/png",
          sizeBytes: BigInt(4096),
          width: 1200,
          height: 300,
          uploadedById: uploaderId,
          publicApprovedAt: new Date(),
          publicApprovedById: uploaderId,
        },
      });

      assert.equal(privateAsset.publicApprovedAt, null);
      assert.equal(privateAsset.publicApprovedById, null);
      assert.equal(publicAsset.publicApprovedById, uploaderId);
      assert.equal(publicAsset.width, 1200);
      assert.equal(publicAsset.height, 300);
    });
  });

  it("stores expiring upload intents with verified metadata pending completion", async () => {
    await withTestUploader(async (tx, uploaderId) => {
      const intent = await tx.mediaUploadIntent.create({
        data: {
          id: randomUUID(),
          objectKey: `assets/${randomUUID()}.png`,
          stagingKey: `incoming/${randomUUID()}`,
          type: "image",
          title: "Test upload",
          originalFilename: "test.png",
          claimedMimeType: "image/png",
          sizeBytes: BigInt(1024),
          uploadedById: uploaderId,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      assert.equal(intent.completedAt, null);
      assert.equal(intent.cancelledAt, null);
      assert.equal(intent.claimedMimeType, "image/png");
      assert.equal(intent.sizeBytes, BigInt(1024));
    });
  });

  it("rejects upload intents marked completed and cancelled simultaneously", async () => {
    await expectConstraintViolation("23514", async (tx, uploaderId) => {
      await tx.$executeRaw`
        INSERT INTO "MediaUploadIntent" (
          "id", "objectKey", "stagingKey", "type", "title",
          "originalFilename", "claimedMimeType", "sizeBytes",
          "uploadedById", "expiresAt", "completedAt", "cancelledAt"
        ) VALUES (
          ${randomUUID()}, ${`assets/${randomUUID()}.png`},
          ${`incoming/${randomUUID()}`}, 'image', 'Invalid terminal state',
          'state.png', 'image/png', 1024, ${uploaderId},
          CURRENT_TIMESTAMP + INTERVAL '5 minutes',
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
      `;
    });
  });

  it("rejects upload intents that exceed limits or mismatch media categories", async () => {
    await expectConstraintViolation("23514", async (tx, uploaderId) => {
      await tx.$executeRaw`
        INSERT INTO "MediaUploadIntent" (
          "id", "objectKey", "stagingKey", "type", "title",
          "originalFilename", "claimedMimeType", "sizeBytes",
          "uploadedById", "expiresAt"
        ) VALUES (
          ${randomUUID()}, ${`assets/${randomUUID()}.png`},
          ${`incoming/${randomUUID()}`}, 'document', 'Invalid upload',
          'invalid.png', 'image/png', 1024, ${uploaderId},
          CURRENT_TIMESTAMP + INTERVAL '5 minutes'
        )
      `;
    });
    await expectConstraintViolation("23514", async (tx, uploaderId) => {
      await tx.$executeRaw`
        INSERT INTO "MediaUploadIntent" (
          "id", "objectKey", "stagingKey", "type", "title",
          "originalFilename", "claimedMimeType", "sizeBytes",
          "uploadedById", "expiresAt"
        ) VALUES (
          ${randomUUID()}, ${`assets/${randomUUID()}.png`},
          ${`incoming/${randomUUID()}`}, 'image', 'Oversized upload',
          'oversized.png', 'image/png', 10485761, ${uploaderId},
          CURRENT_TIMESTAMP + INTERVAL '5 minutes'
        )
      `;
    });
  });

  it("rejects public assets without recorded approval", async () => {
    await expectConstraintViolation("23514", async (tx, uploaderId) => {
      await tx.$executeRaw`
        INSERT INTO "MediaAsset" (
          "id", "objectKey", "bucketAccess", "type", "title",
          "originalFilename", "verifiedMimeType", "sizeBytes", "uploadedById"
        ) VALUES (
          ${randomUUID()}, 'brand/unapproved.png', 'public_read', 'brand',
          'Unapproved', 'unapproved.png', 'image/png', 10, ${uploaderId}
        )
      `;
    });
  });

  it("rejects invalid object keys, file sizes, and dimension pairs", async () => {
    const invalidRows: {
      objectKey: string;
      sizeBytes: number;
      width: number | null;
      height: number | null;
      verifiedMimeType?: string;
    }[] = [
      {
        objectKey: "../private/file.pdf",
        sizeBytes: 10,
        width: null,
        height: null,
      },
      {
        objectKey: "private/zero.pdf",
        sizeBytes: 0,
        width: null,
        height: null,
      },
      {
        objectKey: "images/partial.png",
        sizeBytes: 10,
        width: 100,
        height: null,
      },
      {
        objectKey: "images/mime.png",
        sizeBytes: 10,
        width: null,
        height: null,
        verifiedMimeType: "image",
      },
    ];

    for (const [index, row] of invalidRows.entries()) {
      await expectConstraintViolation("23514", async (tx, uploaderId) => {
        await tx.$executeRaw`
          INSERT INTO "MediaAsset" (
            "id", "objectKey", "bucketAccess", "type", "title",
            "originalFilename", "verifiedMimeType", "sizeBytes",
            "width", "height", "uploadedById"
          ) VALUES (
            ${randomUUID()}, ${row.objectKey}, 'private', 'image',
            ${`Invalid ${index}`}, 'invalid.png',
            ${row.verifiedMimeType ?? "image/png"},
            ${row.sizeBytes}, ${row.width}, ${row.height}, ${uploaderId}
          )
        `;
      });
    }
  });

  it("does not allow changing an asset's storage key or bucket access", async () => {
    await expectConstraintViolation("23514", async (tx, uploaderId) => {
      const asset = await tx.mediaAsset.create({
        data: {
          objectKey: "private/images/immutable.png",
          bucketAccess: "private",
          type: "image",
          title: "Immutable asset",
          originalFilename: "immutable.png",
          verifiedMimeType: "image/png",
          sizeBytes: BigInt(10),
          uploadedById: uploaderId,
        },
      });

      await tx.$executeRaw`
        UPDATE "MediaAsset"
        SET "objectKey" = 'public/images/immutable.png',
            "bucketAccess" = 'public_read',
            "publicApprovedAt" = CURRENT_TIMESTAMP,
            "publicApprovedById" = ${uploaderId}
        WHERE "id" = ${asset.id}
      `;
    });
  });

  it("keeps object keys unique within each access class", async () => {
    await expectConstraintViolation("23505", async (tx, uploaderId) => {
      const asset: Prisma.MediaAssetUncheckedCreateInput = {
        objectKey: "images/unique-key.png",
        bucketAccess: "private",
        type: "image",
        title: "Unique key test",
        originalFilename: "unique-key.png",
        verifiedMimeType: "image/png",
        sizeBytes: BigInt(10),
        uploadedById: uploaderId,
      };

      await tx.mediaAsset.create({ data: asset });
      await tx.mediaAsset.create({
        data: { ...asset, id: randomUUID() },
      });
    });
  });

  it("orders vehicle photos from zero and caps each gallery at twenty", async () => {
    await withTestVehicle(async (tx, vehicleId, _dealerId, uploaderId) => {
      const assets: (Prisma.MediaAssetCreateManyInput & { id: string })[] =
        Array.from({ length: 21 }, () => {
          const id = randomUUID();
          return {
            id,
            objectKey: `assets/${id}.png`,
            bucketAccess: "private",
            type: "image",
            title: "Test vehicle photo",
            originalFilename: "vehicle.png",
            verifiedMimeType: "image/png",
            sizeBytes: BigInt(12),
            uploadedById: uploaderId,
          };
        });
      await tx.mediaAsset.createMany({ data: assets });
      await tx.vehicleMedia.createMany({
        data: assets.slice(0, 20).map((asset, position) => ({
          vehicleId,
          mediaAssetId: asset.id,
          position,
        })),
      });

      const ordered = await tx.vehicleMedia.findMany({
        where: { vehicleId },
        orderBy: { position: "asc" },
      });
      assert.equal(ordered.length, 20);
      assert.equal(ordered[0]?.position, 0);
      assert.equal(ordered[0]?.mediaAssetId, assets[0]?.id);
      assert.equal(ordered[19]?.position, 19);

      const twentyFirstAsset = assets[20];
      assert.ok(twentyFirstAsset);
      await expectConstraintViolationInTransaction(tx, "23514", () =>
        tx.vehicleMedia.create({
          data: {
            vehicleId,
            mediaAssetId: twentyFirstAsset.id,
            position: 20,
          },
        }),
      );
    });
  });

  it("allows a vehicle photo on only one vehicle and one position per vehicle", async () => {
    await withTestVehicle(async (tx, vehicleId, dealerId, uploaderId) => {
      const secondVehicle = await createTestVehicle(tx, uploaderId, dealerId);
      const image = await tx.mediaAsset.create({
        data: {
          objectKey: `assets/${randomUUID()}.png`,
          bucketAccess: "private",
          type: "image",
          title: "Test vehicle photo",
          originalFilename: "vehicle.png",
          verifiedMimeType: "image/png",
          sizeBytes: BigInt(12),
          uploadedById: uploaderId,
        },
      });
      const otherImage = await tx.mediaAsset.create({
        data: {
          objectKey: `assets/${randomUUID()}.png`,
          bucketAccess: "private",
          type: "image",
          title: "Second vehicle photo",
          originalFilename: "vehicle-2.png",
          verifiedMimeType: "image/png",
          sizeBytes: BigInt(12),
          uploadedById: uploaderId,
        },
      });

      await tx.vehicleMedia.create({
        data: {
          vehicleId,
          mediaAssetId: image.id,
          position: 0,
        },
      });
      await expectConstraintViolationInTransaction(tx, "23505", () =>
        tx.vehicleMedia.create({
          data: {
            vehicleId,
            mediaAssetId: otherImage.id,
            position: 0,
          },
        }),
      );
      await expectConstraintViolationInTransaction(tx, "23505", () =>
        tx.vehicleMedia.create({
          data: {
            vehicleId: secondVehicle.id,
            mediaAssetId: image.id,
            position: 0,
          },
        }),
      );
    });
  });

  it("allows only image assets and prevents reclassifying attached media", async () => {
    await withTestVehicle(async (tx, vehicleId, _dealerId, uploaderId) => {
      const document = await tx.mediaAsset.create({
        data: {
          objectKey: `assets/${randomUUID()}.pdf`,
          bucketAccess: "private",
          type: "document",
          title: "Private legal document",
          originalFilename: "contract.pdf",
          verifiedMimeType: "application/pdf",
          sizeBytes: BigInt(12),
          uploadedById: uploaderId,
        },
      });
      await expectConstraintViolationInTransaction(tx, "23514", () =>
        tx.vehicleMedia.create({
          data: {
            vehicleId,
            mediaAssetId: document.id,
            position: 0,
          },
        }),
      );

      const image = await tx.mediaAsset.create({
        data: {
          objectKey: `assets/${randomUUID()}.png`,
          bucketAccess: "private",
          type: "image",
          title: "Test vehicle photo",
          originalFilename: "vehicle.png",
          verifiedMimeType: "image/png",
          sizeBytes: BigInt(12),
          uploadedById: uploaderId,
        },
      });
      await tx.vehicleMedia.create({
        data: {
          vehicleId,
          mediaAssetId: image.id,
          position: 0,
        },
      });
      await expectConstraintViolationInTransaction(tx, "23514", () =>
        tx.mediaAsset.update({
          where: { id: image.id },
          data: { type: "brand" },
        }),
      );
      await expectConstraintViolationInTransaction(tx, "23503", () =>
        tx.mediaAsset.delete({ where: { id: image.id } }),
      );
    });
  });
});
