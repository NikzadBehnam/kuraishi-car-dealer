import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

import { createMediaTestDatabase } from "./media-test-client.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
} from "../src/lib/media-storage.ts";

const { prisma } = createMediaTestDatabase();
const s3 = getMediaStorageClient();
const bucket = getPrivateMediaBucket();

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
});
