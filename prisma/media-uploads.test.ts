import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
  AuthorizationError,
  assertAdminSession,
  assertAuthenticatedSession,
} from "../src/lib/auth-access.ts";
import type { AuthSession } from "../src/lib/auth-access.ts";
import { ZodError } from "zod";
import { createMediaTestDatabase } from "./media-test-client.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
} from "../src/lib/media-storage.ts";

const { prisma, connectionString } = createMediaTestDatabase();
const s3 = getMediaStorageClient();
const bucket = getPrivateMediaBucket();
const userId = randomUUID();
let session:
  (AuthSession & { user: { id: string; role?: string | null } }) | null = null;
let dbMock: ReturnType<typeof mock.module> | undefined;
let sessionMock: ReturnType<typeof mock.module> | undefined;
let uploads: typeof import("../src/lib/media-uploads.ts");
let attachments: typeof import("../src/lib/media-attachments.ts");
const uploadIds: string[] = [];

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

async function postFile(
  upload: {
    url: string;
    fields: Record<string, string>;
  },
  content: Buffer,
) {
  const form = new FormData();
  for (const [name, value] of Object.entries(upload.fields)) {
    form.set(name, value);
  }
  const bytes = new ArrayBuffer(content.byteLength);
  new Uint8Array(bytes).set(content);
  form.set("file", new Blob([bytes], { type: "image/png" }), "test.png");
  const response = await fetch(upload.url, { method: "POST", body: form });
  assert.ok(
    [200, 201, 204].includes(response.status),
    `Expected upload success, received HTTP ${response.status}.`,
  );
  return response;
}

async function assertObjectMissing(key: string) {
  await assert.rejects(
    s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })),
    (error: unknown) =>
      error instanceof Error &&
      (error.name === "NotFound" || error.name === "NoSuchKey"),
  );
}

async function expireIntent(uploadId: string) {
  const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await prisma.mediaUploadIntent.update({
    where: { id: uploadId },
    data: {
      createdAt,
      expiresAt: new Date(createdAt.getTime() + 60 * 60 * 1000),
    },
  });
}

describe("media upload service on isolated Neon resources", () => {
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
        id: userId,
        name: "Media upload test",
        email: `${userId}@example.invalid`,
      },
    });

    dbMock = mock.module("../src/lib/db.ts", {
      namedExports: { prisma },
    });
    sessionMock = mock.module("../src/lib/session.ts", {
      namedExports: {
        requireSession: async () => assertAuthenticatedSession(session),
        requireAdmin: async () => assertAdminSession(session),
      },
    });
    uploads = await import("../src/lib/media-uploads.ts");
    attachments = await import("../src/lib/media-attachments.ts");
  });

  after(async () => {
    try {
      for (const uploadId of uploadIds) {
        await prisma.mediaUploadIntent.deleteMany({ where: { id: uploadId } });
        await prisma.mediaAsset.deleteMany({ where: { id: uploadId } });
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: `incoming/${uploadId}`,
          }),
        );
        const asset = await prisma.mediaAsset.findUnique({
          where: { id: uploadId },
          select: { objectKey: true },
        });
        if (asset) {
          await s3.send(
            new DeleteObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
          );
        } else {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: `assets/${uploadId}.png`,
            }),
          );
          await s3.send(
            new DeleteObjectCommand({
              Bucket: bucket,
              Key: `assets/${uploadId}.pdf`,
            }),
          );
        }
      }
      await prisma.user.deleteMany({ where: { id: userId } });
    } finally {
      dbMock?.restore();
      sessionMock?.restore();
      await prisma.$disconnect();
      s3.destroy();
    }
  });

  it("requires a fresh staff session before validating or writing", async () => {
    await assert.rejects(
      uploads.createMediaUploadIntents({ files: [] }),
      (error: unknown) =>
        error instanceof AuthorizationError && error.status === 401,
    );
    await assert.rejects(
      attachments.listAttachableMediaAssets({ page: 1, pageSize: 24 }),
      (error: unknown) =>
        error instanceof AuthorizationError && error.status === 401,
    );
    assert.equal(
      await prisma.mediaUploadIntent.count({ where: { uploadedById: userId } }),
      0,
    );
  });

  it("verifies and commits private uploads idempotently without replay exposure", async () => {
    session = { user: { id: userId, role: "user" } };
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);
    const {
      uploads: [upload],
    } = await uploads.createMediaUploadIntents({
      files: [
        {
          originalFilename: "test.png",
          contentType: "image/png",
          sizeBytes: png.length,
          type: "image",
        },
      ],
    });
    uploadIds.push(upload.uploadId);
    await postFile(upload, png);

    const firstCompletion = await uploads.completeMediaUploadIntent({
      uploadId: upload.uploadId,
    });
    assert.equal(firstCompletion.cleanupPending, false);
    assert.equal(firstCompletion.asset.id, upload.uploadId);
    assert.equal(firstCompletion.asset.verifiedMimeType, "image/png");
    const completedIntent = await prisma.mediaUploadIntent.findUniqueOrThrow({
      where: { id: upload.uploadId },
    });
    assert.ok(completedIntent.completedAt);

    const asset = await prisma.mediaAsset.findUniqueOrThrow({
      where: { id: upload.uploadId },
    });
    assert.equal(asset.bucketAccess, "private");
    assert.equal(asset.uploadedById, userId);

    const attachablePage = await attachments.listAttachableMediaAssets({
      page: 1,
      pageSize: 100,
    });
    const attachableAsset = attachablePage.assets.find(
      (candidate) => candidate.id === asset.id,
    );
    assert.ok(attachableAsset);
    assert.equal(attachableAsset.isPublicApproved, false);
    assert.match(
      attachableAsset.previewUrl,
      /^https:\/\/.+[?&]X-Amz-Signature=/,
    );
    const privatePreview = await fetch(attachableAsset.previewUrl);
    assert.equal(privatePreview.status, 200);
    assert.deepEqual(Buffer.from(await privatePreview.arrayBuffer()), png);

    const dealer = await prisma.dealer.create({
      data: { name: `Media attachment test ${randomUUID()}` },
    });
    const vehicleId = randomUUID();
    try {
      await prisma.vehicle.create({
        data: {
          id: vehicleId,
          slug: `media-attachment-${vehicleId}`,
          stockNumber: `MEDIA-${vehicleId.toUpperCase()}`,
          make: "Example",
          model: "Media",
          dealerId: dealer.id,
          createdById: userId,
          updatedById: userId,
          acquisitionDate: new Date("2026-11-18T00:00:00.000Z"),
        },
      });
      await prisma.vehicleMedia.create({
        data: { vehicleId, mediaAssetId: asset.id, position: 0 },
      });
      const attachedPage = await attachments.listAttachableMediaAssets({
        page: 1,
        pageSize: 100,
      });
      assert.equal(
        attachedPage.assets.some((candidate) => candidate.id === asset.id),
        false,
      );
    } finally {
      await prisma.vehicleMedia.deleteMany({ where: { vehicleId } });
      await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
      await prisma.dealer.deleteMany({ where: { id: dealer.id } });
    }

    const finalObject = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
    );
    const finalBytes = await finalObject.Body?.transformToByteArray();
    assert.ok(finalBytes);
    assert.deepEqual(Buffer.from(finalBytes), png);

    const replay = await postFile(upload, Buffer.alloc(png.length, 0x41));
    assert.equal([200, 201, 204].includes(replay.status), true);
    const replayedFinalObject = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
    );
    const replayedFinalBytes =
      await replayedFinalObject.Body?.transformToByteArray();
    assert.ok(replayedFinalBytes);
    assert.deepEqual(Buffer.from(replayedFinalBytes), png);

    await expireIntent(upload.uploadId);
    session = { user: { id: userId, role: "admin" } };
    const cleanup = await uploads.cleanupExpiredMediaUploadIntents();
    assert.ok(cleanup.cleaned >= 1);
    assert.equal(cleanup.failed, 0);
    assert.equal(
      await prisma.mediaUploadIntent.findUnique({
        where: { id: upload.uploadId },
      }),
      null,
    );
    const preservedFinal = await s3.send(
      new GetObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
    );
    const preservedBytes = await preservedFinal.Body?.transformToByteArray();
    assert.ok(preservedBytes);
    assert.deepEqual(Buffer.from(preservedBytes), png);
    await assertObjectMissing(`incoming/${upload.uploadId}`);

    session = { user: { id: userId, role: "user" } };
    const retry = await uploads.completeMediaUploadIntent({
      uploadId: upload.uploadId,
    });
    assert.equal(retry.cleanupPending, false);
    assert.equal(retry.asset.id, upload.uploadId);
  });

  it("rejects foreign intents and content that fails signature verification", async () => {
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);
    const {
      uploads: [upload],
    } = await uploads.createMediaUploadIntents({
      files: [
        {
          originalFilename: "spoofed.png",
          contentType: "image/png",
          sizeBytes: png.length,
          type: "image",
        },
      ],
    });
    uploadIds.push(upload.uploadId);
    await postFile(upload, Buffer.alloc(png.length, 0x41));

    session = { user: { id: randomUUID(), role: "user" } };
    await assert.rejects(
      uploads.completeMediaUploadIntent({ uploadId: upload.uploadId }),
      (error: unknown) =>
        error instanceof uploads.MediaUploadError && error.status === 404,
    );

    session = { user: { id: userId, role: "user" } };
    await assert.rejects(
      uploads.completeMediaUploadIntent({ uploadId: upload.uploadId }),
      (error: unknown) =>
        error instanceof uploads.MediaUploadError && error.status === 422,
    );
    assert.equal(
      await prisma.mediaAsset.count({ where: { id: upload.uploadId } }),
      0,
    );
  });

  it("rejects over-limit batches before creating upload intents", async () => {
    session = { user: { id: userId, role: "user" } };
    const intentCountBefore = await prisma.mediaUploadIntent.count({
      where: { uploadedById: userId },
    });
    const file = {
      originalFilename: "test.png",
      contentType: "image/png",
      sizeBytes: 12,
      type: "image",
    };

    await assert.rejects(
      uploads.createMediaUploadIntents({
        files: Array.from({ length: 6 }, () => file),
      }),
      (error: unknown) => error instanceof ZodError,
    );
    assert.equal(
      await prisma.mediaUploadIntent.count({ where: { uploadedById: userId } }),
      intentCountBefore,
    );
  });

  it("cancels pending uploads and retries bounded cleanup after expiry", async () => {
    session = { user: { id: userId, role: "user" } };
    const png = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);
    const {
      uploads: [upload],
    } = await uploads.createMediaUploadIntents({
      files: [
        {
          originalFilename: "cancelled.png",
          contentType: "image/png",
          sizeBytes: png.length,
          type: "image",
        },
      ],
    });
    uploadIds.push(upload.uploadId);

    const intent = await prisma.mediaUploadIntent.findUniqueOrThrow({
      where: { id: upload.uploadId },
    });
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: intent.stagingKey,
        Body: png,
        ContentType: "image/png",
      }),
    );
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: intent.objectKey,
        Body: png,
        ContentType: "image/png",
      }),
    );

    const cancellation = await uploads.cancelMediaUploadIntent({
      uploadId: upload.uploadId,
    });
    assert.equal(cancellation.cancelled, true);
    assert.equal(cancellation.cleanupPending, false);
    assert.ok(
      (
        await prisma.mediaUploadIntent.findUniqueOrThrow({
          where: { id: upload.uploadId },
        })
      ).cancelledAt,
    );
    await assertObjectMissing(intent.stagingKey);
    await assertObjectMissing(intent.objectKey);
    await assert.rejects(
      uploads.completeMediaUploadIntent({ uploadId: upload.uploadId }),
      (error: unknown) =>
        error instanceof uploads.MediaUploadError && error.status === 409,
    );

    const retry = await uploads.cancelMediaUploadIntent({
      uploadId: upload.uploadId,
    });
    assert.equal(retry.cleanupPending, false);
    await assert.rejects(
      uploads.cleanupExpiredMediaUploadIntents(),
      (error: unknown) =>
        error instanceof AuthorizationError && error.status === 403,
    );

    await expireIntent(upload.uploadId);
    session = { user: { id: userId, role: "admin" } };
    const cleanup = await uploads.cleanupExpiredMediaUploadIntents();
    assert.ok(cleanup.cleaned >= 1);
    assert.equal(cleanup.failed, 0);
    assert.equal(
      await prisma.mediaUploadIntent.findUnique({
        where: { id: upload.uploadId },
      }),
      null,
    );
  });
});
