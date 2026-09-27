import {
  type MediaProviderAdapter,
  MediaProviderError,
  type StoredMediaObject,
} from "./provider.ts";

type UploadThingUploadedFile = {
  key: string;
  name: string;
  size: number;
  type: string;
  ufsUrl: string;
};

type UploadThingUploadError = {
  code: string;
  message: string;
};

type UploadThingUploadResult =
  | { data: UploadThingUploadedFile; error: null }
  | { data: null; error: UploadThingUploadError };

export type UploadThingClient = {
  uploadFiles(files: File[]): Promise<UploadThingUploadResult[]>;
  deleteFiles(keys: string[]): Promise<{
    deletedCount: number;
    success: boolean;
  }>;
};

export function createUploadThingMediaProvider(
  client: UploadThingClient,
): MediaProviderAdapter {
  return {
    name: "uploadthing",

    async uploadFiles(files) {
      if (files.length === 0) {
        return [];
      }

      assertValidFiles(files);

      let results: UploadThingUploadResult[];

      try {
        results = await client.uploadFiles([...files]);
      } catch (error) {
        throw new MediaProviderError(
          "UPLOAD_FAILED",
          "The media provider could not upload the files.",
          { cause: sanitizeProviderError(error) },
        );
      }

      const uploaded = results.flatMap((result) =>
        result.data ? [result.data] : [],
      );
      const failed = results.find((result) => result.error !== null);

      if (results.length !== files.length || failed) {
        await cleanupPartialUpload(client, uploaded);

        throw new MediaProviderError(
          "UPLOAD_FAILED",
          "The media provider could not upload every file.",
          {
            cause: failed
              ? sanitizeProviderError(failed.error)
              : { code: "INCOMPLETE_RESPONSE" },
          },
        );
      }

      return uploaded.map(normalizeUploadedFile);
    },

    async deleteFiles(providerAssetIds) {
      if (providerAssetIds.length === 0) {
        return { deletedCount: 0 };
      }

      const uniqueKeys = [
        ...new Set(providerAssetIds.map((key) => key.trim())),
      ];

      if (uniqueKeys.some((key) => key.length === 0)) {
        throw new MediaProviderError(
          "INVALID_INPUT",
          "Media provider asset identifiers cannot be empty.",
        );
      }

      try {
        const result = await client.deleteFiles(uniqueKeys);

        if (!result.success) {
          throw new MediaProviderError(
            "DELETE_FAILED",
            "The media provider could not delete the files.",
          );
        }

        return { deletedCount: result.deletedCount };
      } catch (error) {
        if (error instanceof MediaProviderError) {
          throw error;
        }

        throw new MediaProviderError(
          "DELETE_FAILED",
          "The media provider could not delete the files.",
          { cause: sanitizeProviderError(error) },
        );
      }
    },
  };
}

function assertValidFiles(files: readonly File[]) {
  if (files.some((file) => !(file instanceof File))) {
    throw new MediaProviderError(
      "INVALID_INPUT",
      "Only File objects can be uploaded to the media provider.",
    );
  }
}

function normalizeUploadedFile(
  file: UploadThingUploadedFile,
): StoredMediaObject {
  return {
    provider: "uploadthing",
    providerAssetId: file.key,
    url: file.ufsUrl,
    originalFilename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
  };
}

async function cleanupPartialUpload(
  client: UploadThingClient,
  uploadedFiles: readonly UploadThingUploadedFile[],
) {
  const uploadedKeys = uploadedFiles.map((file) => file.key);

  if (uploadedKeys.length === 0) {
    return;
  }

  try {
    await client.deleteFiles(uploadedKeys);
  } catch {
    // Preserve the original upload failure. Provider-side observability can be
    // used to locate the exceptional orphan if compensating cleanup also fails.
  }
}

function sanitizeProviderError(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const details: { code?: string; name?: string } = {};

  if ("code" in error && typeof error.code === "string") {
    details.code = error.code;
  }

  if ("name" in error && typeof error.name === "string") {
    details.name = error.name;
  }

  return Object.keys(details).length > 0 ? details : undefined;
}
