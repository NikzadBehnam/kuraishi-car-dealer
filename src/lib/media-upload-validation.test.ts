import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  completedVehicleImageUploadResponseSchema,
  detectMediaMimeType,
  MAX_IMAGE_SIZE_BYTES,
  MAX_MEDIA_FILES_PER_REQUEST,
  MAX_PDF_SIZE_BYTES,
  mediaUploadBatchSchema,
  type CompletedMediaAsset,
} from "./media-upload-validation.ts";

function validFile(overrides: Record<string, unknown> = {}) {
  return {
    originalFilename: "vehicle.png",
    contentType: "image/png",
    sizeBytes: 1024,
    type: "image",
    ...overrides,
  };
}

describe("media upload validation", () => {
  it("accepts the completed image response and rejects non-vehicle media", () => {
    const asset: CompletedMediaAsset = {
      id: "asset-1",
      type: "image",
      title: "Test image",
      originalFilename: "vehicle.png",
      verifiedMimeType: "image/png",
      sizeBytes: 1024,
      uploadedAt: "2026-11-20T20:00:00.000Z",
    };
    const schema = completedVehicleImageUploadResponseSchema;
    const response = { asset, cleanupPending: false };

    assert.deepEqual(schema.parse(response), response);
    for (const fields of [
      { type: "brand" },
      { type: "document", verifiedMimeType: "application/pdf" },
      { verifiedMimeType: "application/pdf" },
    ]) {
      assert.equal(
        schema.safeParse({ ...response, asset: { ...asset, ...fields } })
          .success,
        false,
      );
    }
  });

  it("accepts five supported files and rejects a sixth", () => {
    const files = Array.from({ length: MAX_MEDIA_FILES_PER_REQUEST }, () =>
      validFile(),
    );
    assert.equal(mediaUploadBatchSchema.safeParse({ files }).success, true);
    assert.equal(
      mediaUploadBatchSchema.safeParse({ files: [...files, validFile()] })
        .success,
      false,
    );
  });

  it("enforces the image and PDF byte limits and matching extensions", () => {
    assert.equal(
      mediaUploadBatchSchema.safeParse({
        files: [
          validFile({
            originalFilename: "large.png",
            sizeBytes: MAX_IMAGE_SIZE_BYTES,
          }),
          validFile({
            originalFilename: "terms.pdf",
            contentType: "application/pdf",
            sizeBytes: MAX_PDF_SIZE_BYTES,
            type: "document",
          }),
        ],
      }).success,
      true,
    );
    assert.equal(
      mediaUploadBatchSchema.safeParse({
        files: [validFile({ sizeBytes: MAX_IMAGE_SIZE_BYTES + 1 })],
      }).success,
      false,
    );
    assert.equal(
      mediaUploadBatchSchema.safeParse({
        files: [
          validFile({
            originalFilename: "spoofed.jpg",
            contentType: "image/png",
          }),
        ],
      }).success,
      false,
    );
  });

  it("rejects unsafe names, disallowed types, and mismatched categories", () => {
    for (const originalFilename of [
      "../vehicle.png",
      "folder\\vehicle.png",
      "vehicle\n.png",
    ]) {
      assert.equal(
        mediaUploadBatchSchema.safeParse({
          files: [validFile({ originalFilename })],
        }).success,
        false,
      );
    }
    assert.equal(
      mediaUploadBatchSchema.safeParse({
        files: [validFile({ contentType: "image/svg+xml" })],
      }).success,
      false,
    );
    assert.equal(
      mediaUploadBatchSchema.safeParse({
        files: [validFile({ type: "document" })],
      }).success,
      false,
    );
  });

  it("recognizes only JPEG, PNG, and PDF file signatures", () => {
    assert.equal(
      detectMediaMimeType(Uint8Array.from([0xff, 0xd8, 0xff, 0x00])),
      "image/jpeg",
    );
    assert.equal(
      detectMediaMimeType(
        Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
      "image/png",
    );
    assert.equal(
      detectMediaMimeType(Buffer.from(`%PDF-1.7\n${" ".repeat(1200)}`)),
      "application/pdf",
    );
    assert.equal(
      detectMediaMimeType(
        Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'>"),
      ),
      null,
    );
  });
});
