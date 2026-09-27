import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MediaProviderError } from "./provider.ts";
import {
  createUploadThingMediaProvider,
  type UploadThingClient,
} from "./uploadthing-adapter.ts";
import { readUploadThingConfig } from "./uploadthing-config.ts";

const firstFile = new File(["first-image"], "front.webp", {
  type: "image/webp",
});
const secondFile = new File(["second-image"], "rear.jpg", {
  type: "image/jpeg",
});

describe("UploadThing media provider adapter", () => {
  it("normalizes current UploadThing file data into the shared media contract", async () => {
    const client = createClient({
      uploadFiles: async () => [
        {
          data: {
            key: "vehicle-front-key",
            name: "front.webp",
            size: firstFile.size,
            type: "image/webp",
            ufsUrl: "https://test-app.ufs.sh/f/vehicle-front-key",
          },
          error: null,
        },
      ],
    });
    const provider = createUploadThingMediaProvider(client);

    assert.deepEqual(await provider.uploadFiles([firstFile]), [
      {
        provider: "uploadthing",
        providerAssetId: "vehicle-front-key",
        url: "https://test-app.ufs.sh/f/vehicle-front-key",
        originalFilename: "front.webp",
        mimeType: "image/webp",
        sizeBytes: firstFile.size,
      },
    ]);
  });

  it("compensates successful files when a batch upload partially fails", async () => {
    const deletedKeys: string[][] = [];
    const client = createClient({
      deleteFiles: async (keys) => {
        deletedKeys.push(keys);
        return { deletedCount: keys.length, success: true };
      },
      uploadFiles: async () => [
        {
          data: {
            key: "uploaded-before-failure",
            name: "front.webp",
            size: firstFile.size,
            type: "image/webp",
            ufsUrl: "https://test-app.ufs.sh/f/uploaded-before-failure",
          },
          error: null,
        },
        {
          data: null,
          error: { code: "UPLOAD_FAILED", message: "Provider detail" },
        },
      ],
    });
    const provider = createUploadThingMediaProvider(client);

    await assert.rejects(
      provider.uploadFiles([firstFile, secondFile]),
      (error: unknown) =>
        error instanceof MediaProviderError && error.code === "UPLOAD_FAILED",
    );
    assert.deepEqual(deletedKeys, [["uploaded-before-failure"]]);
  });

  it("deduplicates provider keys before deletion", async () => {
    const deletedKeys: string[][] = [];
    const client = createClient({
      deleteFiles: async (keys) => {
        deletedKeys.push(keys);
        return { deletedCount: keys.length, success: true };
      },
    });
    const provider = createUploadThingMediaProvider(client);

    assert.deepEqual(await provider.deleteFiles(["key-1", "key-1", "key-2"]), {
      deletedCount: 2,
    });
    assert.deepEqual(deletedKeys, [["key-1", "key-2"]]);
  });

  it("reports a safe configuration error when the v7 token is absent", () => {
    assert.throws(
      () => readUploadThingConfig({}),
      (error: unknown) =>
        error instanceof MediaProviderError &&
        error.code === "CONFIGURATION_ERROR" &&
        error.message.includes("UPLOADTHING_TOKEN"),
    );
    assert.deepEqual(readUploadThingConfig({ UPLOADTHING_TOKEN: " token " }), {
      token: "token",
    });
  });
});

function createClient(
  overrides: Partial<UploadThingClient> = {},
): UploadThingClient {
  return {
    deleteFiles: async (keys) => ({
      deletedCount: keys.length,
      success: true,
    }),
    uploadFiles: async () => [],
    ...overrides,
  };
}
