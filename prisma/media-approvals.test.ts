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
  assertAdminSession,
  AuthorizationError,
  type AuthSession,
} from "../src/lib/auth-access.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
  getPublicMediaBucket,
  getPublicMediaObjectUrl,
} from "../src/lib/media-storage.ts";
import { createMediaTestDatabase } from "./media-test-client.ts";

const { prisma, connectionString } = createMediaTestDatabase();
const s3 = getMediaStorageClient();
const privateBucket = getPrivateMediaBucket();
const publicBucket = getPublicMediaBucket();
const actorId = randomUUID();
const imageBytes = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
]);

type TestSession = AuthSession & {
  user: { id: string; role?: string | null };
};

let session: TestSession | null = null;
let dbMock: ReturnType<typeof mock.module> | undefined;
let sessionMock: ReturnType<typeof mock.module> | undefined;
let approvals: typeof import("../src/lib/admin-media-approvals.ts");
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

async function createPrivateImage({
  type = "image",
  putObject = true,
}: {
  type?: "image" | "document";
  putObject?: boolean;
} = {}) {
  const id = randomUUID();
  const mimeType = type === "image" ? "image/png" : "application/pdf";
  const objectKey = `assets/approval-test-${id}.${type === "image" ? "png" : "pdf"}`;
  if (putObject) {
    await s3.send(
      new PutObjectCommand({
        Bucket: privateBucket,
        Key: objectKey,
        Body: imageBytes,
        ContentType: mimeType,
      }),
    );
    objectKeys.push({ Bucket: privateBucket, Key: objectKey });
  }

  await prisma.mediaAsset.create({
    data: {
      id,
      objectKey,
      bucketAccess: "private",
      type,
      title: "Approval test image",
      originalFilename: "approval-test.png",
      altText: "Test vehicle image",
      verifiedMimeType: mimeType,
      sizeBytes: BigInt(imageBytes.length),
      uploadedById: actorId,
    },
  });
  return { id, objectKey, mimeType };
}

async function assertObjectMissing(bucket: string, key: string) {
  await assert.rejects(
    s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })),
    (error: unknown) =>
      error instanceof Error &&
      (error.name === "NotFound" || error.name === "NoSuchKey"),
  );
}

describe("admin media public approvals on isolated Neon resources", () => {
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
        name: "Media approval test",
        email: `${actorId}@example.invalid`,
      },
    });

    dbMock = mock.module("../src/lib/db.ts", {
      namedExports: { prisma },
    });
    sessionMock = mock.module("../src/lib/session.ts", {
      namedExports: {
        requireAdmin: async () => assertAdminSession(session),
      },
    });
    approvals = await import("../src/lib/admin-media-approvals.ts");
  });

  after(async () => {
    try {
      if (triggerInstalled) {
        await prisma.$executeRawUnsafe(
          'DROP TRIGGER IF EXISTS "test_reject_public_media_approval" ON "MediaAsset"',
        );
        await prisma.$executeRawUnsafe(
          'DROP FUNCTION IF EXISTS "test_reject_public_media_approval_fn"()',
        );
      }
      await prisma.mediaAsset.deleteMany({ where: { uploadedById: actorId } });
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

  it("requires a fresh administrator session before validating or writing", async () => {
    await assert.rejects(
      approvals.approvePublicMediaAsset({ invalid: true }),
      (error: unknown) =>
        error instanceof AuthorizationError && error.status === 401,
    );
    session = { user: { id: actorId, role: "user" } };
    await assert.rejects(
      approvals.approvePublicMediaAsset({ mediaAssetId: randomUUID() }),
      (error: unknown) =>
        error instanceof AuthorizationError && error.status === 403,
    );
    assert.equal(await prisma.mediaAsset.count(), 0);
  });

  it("copies a private image to a distinct approved public asset idempotently", async () => {
    session = { user: { id: actorId, role: "admin" } };
    const source = await createPrivateImage();
    const publicKey = `approved/${source.id}.png`;
    objectKeys.push({ Bucket: publicBucket, Key: publicKey });

    const result = await approvals.approvePublicMediaAsset({
      mediaAssetId: source.id,
    });
    const publicCopy = await prisma.mediaAsset.findUniqueOrThrow({
      where: { id: result.publicMediaAssetId },
    });
    const original = await prisma.mediaAsset.findUniqueOrThrow({
      where: { id: source.id },
    });

    assert.equal(result.sourceMediaAssetId, source.id);
    assert.equal(result.reused, false);
    assert.notEqual(result.publicMediaAssetId, source.id);
    assert.equal(original.bucketAccess, "private");
    assert.equal(original.publicApprovedAt, null);
    assert.equal(original.publicApprovedById, null);
    assert.equal(publicCopy.bucketAccess, "public_read");
    assert.equal(publicCopy.objectKey, publicKey);
    assert.equal(publicCopy.publicApprovedById, actorId);
    assert.ok(publicCopy.publicApprovedAt);

    const publicObject = await s3.send(
      new GetObjectCommand({ Bucket: publicBucket, Key: publicKey }),
    );
    const copiedBytes = await publicObject.Body?.transformToByteArray();
    assert.ok(copiedBytes);
    assert.deepEqual(Buffer.from(copiedBytes), imageBytes);
    assert.equal(publicObject.ContentType, source.mimeType);

    const publicUrl = getPublicMediaObjectUrl(publicCopy);
    assert.ok(publicUrl);
    const response = await fetch(publicUrl);
    assert.equal(response.status, 200);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), imageBytes);

    const repeated = await approvals.approvePublicMediaAsset({
      mediaAssetId: source.id,
    });
    assert.equal(repeated.publicMediaAssetId, publicCopy.id);
    assert.equal(repeated.reused, true);
    assert.equal(
      await prisma.mediaAsset.count({
        where: {
          bucketAccess: "public_read",
          objectKey: publicKey,
        },
      }),
      1,
    );
  });

  it("rejects unsupported, already public, and missing private image objects", async () => {
    session = { user: { id: actorId, role: "admin" } };
    const document = await createPrivateImage({ type: "document" });
    const missingImage = await createPrivateImage({ putObject: false });

    await assert.rejects(
      approvals.approvePublicMediaAsset({ mediaAssetId: document.id }),
      (error: unknown) =>
        error instanceof approvals.MediaApprovalError && error.status === 422,
    );
    await assert.rejects(
      approvals.approvePublicMediaAsset({ mediaAssetId: randomUUID() }),
      (error: unknown) =>
        error instanceof approvals.MediaApprovalError && error.status === 404,
    );
    await assert.rejects(
      approvals.approvePublicMediaAsset({ mediaAssetId: missingImage.id }),
      (error: unknown) =>
        error instanceof approvals.MediaApprovalError && error.status === 422,
    );

    const publicImage = await prisma.mediaAsset.create({
      data: {
        objectKey: `assets/approval-test-${randomUUID()}.png`,
        bucketAccess: "public_read",
        type: "image",
        title: "Already public",
        originalFilename: "already-public.png",
        verifiedMimeType: "image/png",
        sizeBytes: BigInt(imageBytes.length),
        uploadedById: actorId,
        publicApprovedAt: new Date(),
        publicApprovedById: actorId,
      },
    });
    await assert.rejects(
      approvals.approvePublicMediaAsset({ mediaAssetId: publicImage.id }),
      (error: unknown) =>
        error instanceof approvals.MediaApprovalError && error.status === 409,
    );
  });

  it("does not reuse an approved asset whose public object is missing", async () => {
    session = { user: { id: actorId, role: "admin" } };
    const source = await createPrivateImage();
    const publicKey = `approved/${source.id}.png`;
    const publicCopy = await prisma.mediaAsset.create({
      data: {
        objectKey: publicKey,
        bucketAccess: "public_read",
        type: "image",
        title: "Approval test image",
        originalFilename: "approval-test.png",
        altText: "Test vehicle image",
        verifiedMimeType: source.mimeType,
        sizeBytes: BigInt(imageBytes.length),
        uploadedById: actorId,
        publicApprovedAt: new Date(),
        publicApprovedById: actorId,
      },
    });

    await assert.rejects(
      approvals.approvePublicMediaAsset({ mediaAssetId: source.id }),
      (error: unknown) =>
        error instanceof approvals.MediaApprovalError && error.status === 422,
    );
    const storedCopy = await prisma.mediaAsset.findUniqueOrThrow({
      where: { id: publicCopy.id },
    });
    assert.equal(storedCopy.id, publicCopy.id);
    await assertObjectMissing(publicBucket, publicKey);
  });

  it("removes a public object if recording its approval fails", async () => {
    session = { user: { id: actorId, role: "admin" } };
    const source = await createPrivateImage();
    const publicKey = `approved/${source.id}.png`;
    objectKeys.push({ Bucket: publicBucket, Key: publicKey });

    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION "test_reject_public_media_approval_fn"() RETURNS trigger
      LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW."bucketAccess" = 'public_read' THEN
          RAISE EXCEPTION 'intentional public approval test failure';
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "test_reject_public_media_approval"
      BEFORE INSERT ON "MediaAsset"
      FOR EACH ROW EXECUTE FUNCTION "test_reject_public_media_approval_fn"();
    `);
    triggerInstalled = true;

    await assert.rejects(
      approvals.approvePublicMediaAsset({ mediaAssetId: source.id }),
    );
    assert.equal(
      await prisma.mediaAsset.count({
        where: { bucketAccess: "public_read", objectKey: publicKey },
      }),
      0,
    );
    await assertObjectMissing(publicBucket, publicKey);
  });
});
