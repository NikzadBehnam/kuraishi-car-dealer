import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

import { createMediaTestDatabase } from "./media-test-client.ts";
import {
  getPublicMediaObjectUrl,
  getMediaStorageClient,
  getPrivateMediaBucket,
} from "../src/lib/media-storage.ts";
import nextConfig from "../next.config.ts";

const { prisma } = createMediaTestDatabase();
const s3 = getMediaStorageClient();
const bucket = getPrivateMediaBucket();
const publicBucket = process.env.MEDIA_PUBLIC_BUCKET;

describe("isolated Neon media storage", { concurrency: false }, () => {
  after(async () => {
    await prisma.$disconnect();
    s3.destroy();
  });

  it("enforces signed upload size and content-type conditions, then copies verified keys", async () => {
    const id = randomUUID();
    const stagingKey = `incoming/test/${id}`;
    const finalKey = `assets/test/${id}.png`;
    const validPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
    ]);

    try {
      const post = await createPresignedPost(s3, {
        Bucket: bucket,
        Key: stagingKey,
        Conditions: [
          ["content-length-range", validPng.length, validPng.length],
          ["eq", "$Content-Type", "image/png"],
          ["eq", "$key", stagingKey],
        ],
        Fields: { "Content-Type": "image/png" },
        Expires: 60,
      });

      const form = new FormData();
      for (const [name, value] of Object.entries(post.fields)) {
        form.set(name, value);
      }
      form.set("file", new Blob([validPng], { type: "image/png" }), "test.png");
      const uploadResponse = await fetch(post.url, {
        method: "POST",
        body: form,
      });
      assert.ok(
        [200, 201, 204].includes(uploadResponse.status),
        `Expected upload success, received HTTP ${uploadResponse.status}.`,
      );

      const head = await s3.send(
        new HeadObjectCommand({ Bucket: bucket, Key: stagingKey }),
      );
      assert.equal(head.ContentLength, validPng.length);
      assert.equal(head.ContentType, "image/png");

      await s3.send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: finalKey,
          CopySource: `/${bucket}/${stagingKey}`,
          MetadataDirective: "REPLACE",
          ContentType: "image/png",
        }),
      );
      const copied = await s3.send(
        new HeadObjectCommand({ Bucket: bucket, Key: finalKey }),
      );
      assert.equal(copied.ContentLength, validPng.length);
      assert.equal(copied.ContentType, "image/png");

      const oversizedForm = new FormData();
      for (const [name, value] of Object.entries(post.fields)) {
        oversizedForm.set(name, value);
      }
      oversizedForm.set(
        "file",
        new Blob([Buffer.concat([validPng, Buffer.from([0])])], {
          type: "image/png",
        }),
        "test.png",
      );
      const rejectedResponse = await fetch(post.url, {
        method: "POST",
        body: oversizedForm,
      });
      assert.equal(rejectedResponse.status, 400);
    } finally {
      await s3.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: stagingKey }),
      );
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: finalKey }));
    }
  });

  it("serves only approved public assets from the public bucket", async () => {
    assert.ok(
      publicBucket,
      "An isolated public media test bucket is required.",
    );
    assert.notEqual(publicBucket, bucket);

    const objectKey = `assets/test/${randomUUID()}.png`;
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const publicUrl = getPublicMediaObjectUrl({
      objectKey,
      bucketAccess: "public_read",
      publicApprovedAt: new Date(),
      publicApprovedById: randomUUID(),
    });

    assert.ok(publicUrl);
    const parsedPublicUrl = new URL(publicUrl);
    const endpointValue = process.env.AWS_ENDPOINT_URL_S3;
    assert.ok(endpointValue, "An isolated media storage endpoint is required.");
    const endpointUrl = new URL(endpointValue);
    assert.equal(parsedPublicUrl.origin, endpointUrl.origin);
    assert.equal(parsedPublicUrl.pathname, `/${publicBucket}/${objectKey}`);
    assert.equal(parsedPublicUrl.search, "");
    assert.ok(
      nextConfig.images?.remotePatterns?.some(
        (pattern) =>
          !(pattern instanceof URL) &&
          pattern.protocol === "https" &&
          pattern.hostname === endpointUrl.hostname &&
          pattern.pathname === `/${publicBucket}/**` &&
          pattern.search === "",
      ),
    );
    assert.equal(
      getPublicMediaObjectUrl({
        objectKey,
        bucketAccess: "private",
        publicApprovedAt: null,
        publicApprovedById: null,
      }),
      null,
    );
    assert.throws(
      () =>
        getPublicMediaObjectUrl({
          objectKey,
          bucketAccess: "public_read",
          publicApprovedAt: null,
          publicApprovedById: null,
        }),
      /Public media requires a recorded approval/,
    );

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: publicBucket,
          Key: objectKey,
          Body: bytes,
          ContentType: "image/png",
        }),
      );
      const response = await fetch(publicUrl);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "image/png");
      assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
    } finally {
      await s3.send(
        new DeleteObjectCommand({ Bucket: publicBucket, Key: objectKey }),
      );
    }
  });
});
