import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";

import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

import { AuthorizationError } from "../src/lib/auth-access.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
  getPublicMediaBucket,
} from "../src/lib/media-storage.ts";
import { createMediaTestDatabase } from "./media-test-client.ts";

const { prisma, connectionString } = createMediaTestDatabase();
const s3 = getMediaStorageClient();
const bucket = getPrivateMediaBucket();
const publicBucket = getPublicMediaBucket();
const actorId = randomUUID();
const dealerId = randomUUID();
const vehicleId = randomUUID();
const objectKeys: { Bucket: string; Key: string }[] = [];

let adminAllowed = true;
let dbMock: ReturnType<typeof mock.module> | undefined;
let sessionMock: ReturnType<typeof mock.module> | undefined;
let mediaDeletions: typeof import("../src/lib/admin-media-deletions.ts");

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

async function createAsset({
  attached = false,
  publicRead = false,
}: {
  attached?: boolean;
  publicRead?: boolean;
} = {}) {
  const id = randomUUID();
  const objectKey = `tests/deletions/${id}.png`;
  const objectBucket = publicRead ? publicBucket : bucket;
  const body = Buffer.from(`media deletion fixture ${id}`);
  await s3.send(
    new PutObjectCommand({
      Bucket: objectBucket,
      Key: objectKey,
      Body: body,
      ContentType: "image/png",
    }),
  );
  objectKeys.push({ Bucket: objectBucket, Key: objectKey });

  await prisma.mediaAsset.create({
    data: {
      id,
      objectKey,
      bucketAccess: publicRead ? "public_read" : "private",
      type: "image",
      title: "Deletion test",
      originalFilename: `${id}.png`,
      verifiedMimeType: "image/png",
      sizeBytes: BigInt(body.byteLength),
      uploadedById: actorId,
      ...(publicRead
        ? { publicApprovedAt: new Date(), publicApprovedById: actorId }
        : {}),
    },
  });
  if (attached) {
    await prisma.vehicleMedia.create({
      data: { vehicleId, mediaAssetId: id, position: 0 },
    });
  }
  return { id, objectKey };
}

describe(
  "admin media deletions on isolated Neon resources",
  { concurrency: false },
  () => {
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
          name: "Media deletion test",
          email: `${actorId}@example.invalid`,
        },
      });
      await prisma.dealer.create({
        data: { id: dealerId, name: "Media deletion test dealership" },
      });
      await prisma.vehicle.create({
        data: {
          id: vehicleId,
          slug: `media-deletion-${vehicleId}`,
          stockNumber: `DELETE-${vehicleId.slice(0, 8)}`.toUpperCase(),
          make: "Test",
          model: "Vehicle",
          acquisitionDate: new Date("2026-01-01T00:00:00.000Z"),
          createdById: actorId,
          updatedById: actorId,
          dealerId,
        },
      });

      dbMock = mock.module("../src/lib/db.ts", {
        namedExports: { prisma },
      });
      sessionMock = mock.module("../src/lib/session.ts", {
        namedExports: {
          requireAdmin: async () => {
            if (!adminAllowed) {
              throw new AuthorizationError(
                403,
                "Administrator access required.",
              );
            }
          },
        },
      });
      mediaDeletions = await import("../src/lib/admin-media-deletions.ts");
    });

    after(async () => {
      try {
        await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
        await prisma.mediaAsset.deleteMany({
          where: { uploadedById: actorId },
        });
        await prisma.dealer.deleteMany({ where: { id: dealerId } });
        await prisma.user.deleteMany({ where: { id: actorId } });
        await Promise.all(
          objectKeys.map(({ Bucket, Key }) =>
            s3.send(new DeleteObjectCommand({ Bucket, Key })),
          ),
        );
      } finally {
        dbMock?.restore();
        sessionMock?.restore();
        await prisma.$disconnect();
        s3.destroy();
      }
    });

    it("requires administrator access before validating the request", async () => {
      adminAllowed = false;
      try {
        await assert.rejects(
          mediaDeletions.queryAdminMediaDeletions(prisma, { invalid: true }),
          (error: unknown) =>
            error instanceof AuthorizationError && error.status === 403,
        );
      } finally {
        adminAllowed = true;
      }
    });

    it("deletes unused files and reports attached and missing assets individually", async () => {
      const unused = await createAsset();
      const attached = await createAsset({ attached: true, publicRead: true });
      const missingId = randomUUID();

      const result = await mediaDeletions.queryAdminMediaDeletions(prisma, {
        ids: [unused.id, attached.id, missingId],
      });

      assert.deepEqual(
        result.results.map(({ id, status }) => ({ id, status })),
        [
          { id: unused.id, status: "deleted" },
          { id: attached.id, status: "in_use" },
          { id: missingId, status: "not_found" },
        ],
      );
      assert.equal(
        await prisma.mediaAsset.findUnique({ where: { id: unused.id } }),
        null,
      );
      assert.ok(
        await prisma.mediaAsset.findUnique({ where: { id: attached.id } }),
      );
      await s3.send(
        new HeadObjectCommand({
          Bucket: publicBucket,
          Key: attached.objectKey,
        }),
      );
      await assert.rejects(
        s3.send(
          new HeadObjectCommand({ Bucket: bucket, Key: unused.objectKey }),
        ),
      );
    });

    it("deletes an approved public asset from the public bucket", async () => {
      const asset = await createAsset({ publicRead: true });
      const result = await mediaDeletions.queryAdminMediaDeletions(prisma, {
        ids: [asset.id],
      });

      assert.equal(result.results[0]?.status, "deleted");
      assert.equal(
        await prisma.mediaAsset.findUnique({ where: { id: asset.id } }),
        null,
      );
      await assert.rejects(
        s3.send(
          new HeadObjectCommand({ Bucket: publicBucket, Key: asset.objectKey }),
        ),
      );
    });

    it("keeps the database asset when object storage deletion fails", async () => {
      const asset = await createAsset();
      const sendMock = mock.method(s3, "send", async () => {
        throw new Error("Test-only storage failure.");
      });
      try {
        const result = await mediaDeletions.queryAdminMediaDeletions(prisma, {
          ids: [asset.id],
        });
        assert.equal(result.results[0]?.status, "failed");
        assert.match(result.results[0]?.message ?? "", /verify the asset/u);
        assert.ok(
          await prisma.mediaAsset.findUnique({ where: { id: asset.id } }),
        );
      } finally {
        sendMock.mock.restore();
      }

      await s3.send(
        new HeadObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
      );
    });
  },
);
