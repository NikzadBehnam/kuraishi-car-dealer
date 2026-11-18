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
});
