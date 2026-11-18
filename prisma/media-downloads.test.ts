import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { after, before, describe, it, mock } from "node:test";

import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import { AuthorizationError } from "../src/lib/auth-access.ts";
import { Prisma } from "../src/generated/prisma/client.ts";
import { createMediaTestDatabase } from "./media-test-client.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
} from "../src/lib/media-storage.ts";
import { MAX_MEDIA_DOWNLOAD_BYTES } from "../src/lib/media-download-validation.ts";

const { prisma, connectionString } = createMediaTestDatabase();
const s3 = getMediaStorageClient();
const bucket = getPrivateMediaBucket();
const actorId = randomUUID();
const rollback = new Error("Roll back isolated media download test data.");

let adminAllowed = true;
let dbMock: ReturnType<typeof mock.module> | undefined;
let sessionMock: ReturnType<typeof mock.module> | undefined;
let mediaDownloads: typeof import("../src/lib/admin-media-downloads.ts");

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

async function withDownloadAssets(
  verify: (
    tx: Prisma.TransactionClient,
    ids: string[],
    bodies: Buffer[],
  ) => Promise<void>,
) {
  const ids = [randomUUID(), randomUUID()];
  const keys = ids.map((id) => `tests/download/${id}.pdf`);
  const bodies = [
    Buffer.from("first test document"),
    Buffer.from("second test document"),
  ];

  try {
    for (let index = 0; index < keys.length; index += 1) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: keys[index],
          Body: bodies[index],
          ContentType: "application/pdf",
        }),
      );
    }

    await assert.rejects(
      prisma.$transaction(
        async (tx) => {
          await tx.user.create({
            data: {
              id: actorId,
              name: "Media download test",
              email: `${actorId}@example.invalid`,
            },
          });
          for (let index = 0; index < ids.length; index += 1) {
            await tx.mediaAsset.create({
              data: {
                id: ids[index],
                objectKey: keys[index],
                bucketAccess: "private",
                type: "document",
                title: `Download test ${index + 1}`,
                originalFilename: "document.pdf",
                verifiedMimeType: "application/pdf",
                sizeBytes: BigInt(bodies[index].byteLength),
                uploadedById: actorId,
              },
            });
          }

          await verify(tx, ids, bodies);
          throw rollback;
        },
        { timeout: 60000 },
      ),
      (error: unknown) => error === rollback,
    );
  } finally {
    await Promise.all(
      keys.map((Key) =>
        s3.send(new DeleteObjectCommand({ Bucket: bucket, Key })),
      ),
    );
  }
}

describe(
  "admin media downloads on isolated Neon resources",
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
      mediaDownloads = await import("../src/lib/admin-media-downloads.ts");
    });

    after(async () => {
      dbMock?.restore();
      sessionMock?.restore();
      await prisma.$disconnect();
      s3.destroy();
    });

    it("requires administrator access before querying media", async () => {
      adminAllowed = false;
      try {
        await assert.rejects(
          mediaDownloads.queryAdminMediaDownload(prisma, [randomUUID()]),
          (error: unknown) =>
            error instanceof AuthorizationError && error.status === 403,
        );
      } finally {
        adminAllowed = true;
      }
    });

    it("downloads one verified object and streams selected assets as a bounded ZIP", async () => {
      await withDownloadAssets(async (tx, ids, bodies) => {
        const single = await mediaDownloads.queryAdminMediaDownload(tx, [
          ids[0],
        ]);
        assert.equal(single.status, 200);
        assert.equal(
          single.headers.get("content-disposition"),
          `attachment; filename="document.pdf"; filename*=UTF-8''document.pdf`,
        );
        assert.deepEqual(Buffer.from(await single.arrayBuffer()), bodies[0]);

        const bulk = await mediaDownloads.queryAdminMediaDownload(tx, ids);
        assert.equal(bulk.status, 200);
        assert.equal(bulk.headers.get("content-type"), "application/zip");
        assert.equal(bulk.headers.get("cache-control"), "private, no-store");
        const archive = Buffer.from(await bulk.arrayBuffer());
        assert.deepEqual(
          archive.subarray(0, 4),
          Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        );
        assert.ok(archive.includes(Buffer.from("document.pdf")));
        assert.ok(archive.includes(Buffer.from("document (2).pdf")));
        assert.ok(archive.includes(bodies[0]));
        assert.ok(archive.includes(bodies[1]));
        assert.ok(archive.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06])));

        await tx.mediaAsset.update({
          where: { id: ids[0] },
          data: { sizeBytes: BigInt(MAX_MEDIA_DOWNLOAD_BYTES + 1) },
        });
        await assert.rejects(
          mediaDownloads.queryAdminMediaDownload(tx, [ids[0]]),
          (error: unknown) =>
            error instanceof mediaDownloads.MediaDownloadError &&
            error.status === 413,
        );

        await tx.mediaAsset.update({
          where: { id: ids[0] },
          data: { sizeBytes: BigInt(bodies[0].byteLength) },
        });
        await s3.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: `tests/download/${ids[0]}.pdf`,
          }),
        );
        await assert.rejects(
          mediaDownloads.queryAdminMediaDownload(tx, [ids[0]]),
          (error: unknown) =>
            error instanceof mediaDownloads.MediaDownloadError &&
            error.status === 422,
        );
      });
    });
  },
);
