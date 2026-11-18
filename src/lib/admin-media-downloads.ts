import "server-only";

import { GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { PassThrough, Readable } from "node:stream";
import type { PrismaClient } from "../generated/prisma/client.ts";
import type { MediaAsset } from "../generated/prisma/client.ts";
import { ZipFile } from "yazl";

import { prisma } from "./db.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
  getPublicMediaBucket,
  getPublicMediaObjectUrl,
} from "./media-storage.ts";
import {
  MAX_MEDIA_DOWNLOAD_BYTES,
  parseMediaDownloadIds,
} from "./media-download-validation.ts";
import { requireAdmin } from "./session.ts";

type MediaDownloadClient = Pick<PrismaClient, "mediaAsset">;

type StoredAsset = Pick<
  MediaAsset,
  | "id"
  | "objectKey"
  | "bucketAccess"
  | "originalFilename"
  | "verifiedMimeType"
  | "sizeBytes"
  | "publicApprovedAt"
  | "publicApprovedById"
>;

type DownloadAsset = StoredAsset & {
  bucket: string;
  archiveFilename: string;
};

export class MediaDownloadError extends Error {
  readonly status: 404 | 413 | 422;

  constructor(status: 404 | 413 | 422, message: string) {
    super(message);
    this.name = "MediaDownloadError";
    this.status = status;
  }
}

function errorType(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function isMissingObject(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "NotFound" ||
      error.name === "NoSuchKey" ||
      error.name === "NoSuchBucket")
  );
}

function getAssetBucket(asset: StoredAsset): string {
  if (asset.bucketAccess === "private") {
    return getPrivateMediaBucket();
  }
  if (!asset.publicApprovedAt || !asset.publicApprovedById) {
    throw new MediaDownloadError(
      422,
      "A selected public media file has no recorded approval.",
    );
  }
  getPublicMediaObjectUrl(asset);
  return getPublicMediaBucket();
}

function safeFilename(filename: string): string {
  const cleaned = filename
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/gu, "_")
    .trim()
    .replace(/[. ]+$/u, "")
    .slice(0, 180)
    .replace(/[. ]+$/u, "");
  const safe =
    cleaned && cleaned !== "." && cleaned !== ".." ? cleaned : "media";
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/iu.test(safe)
    ? `_${safe}`
    : safe;
}

function getArchiveFilenames(assets: readonly DownloadAsset[]): string[] {
  const usedNames = new Set<string>();

  return assets.map((asset) => {
    const filename = safeFilename(asset.originalFilename);
    const extensionIndex = filename.lastIndexOf(".");
    const stem =
      extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
    const extension = extensionIndex > 0 ? filename.slice(extensionIndex) : "";
    let candidate = filename;
    let suffix = 2;

    while (usedNames.has(candidate.toLocaleLowerCase("en-US"))) {
      candidate = `${stem} (${suffix})${extension}`;
      suffix += 1;
    }
    usedNames.add(candidate.toLocaleLowerCase("en-US"));
    return candidate;
  });
}

function contentDisposition(filename: string): string {
  const fallback = filename
    .replace(/[^\x20-\x7e]/gu, "_")
    .replace(/["\\]/gu, "_");
  const encoded = encodeURIComponent(filename).replace(
    /[!'()*]/gu,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

function assetResponseHeaders(
  filename: string,
  contentType: string,
  contentLength?: number,
): Headers {
  const headers = new Headers({
    "Cache-Control": "private, no-store",
    "Content-Disposition": contentDisposition(filename),
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
  });
  if (contentLength !== undefined) {
    headers.set("Content-Length", String(contentLength));
  }
  return headers;
}

function toWebStream(source: Readable): ReadableStream<Uint8Array> {
  const iterator = source[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await iterator.next();
        if (done) {
          controller.close();
          return;
        }
        if (!(value instanceof Uint8Array)) {
          throw new Error("Media download produced a non-binary stream.");
        }
        controller.enqueue(value);
      } catch (error) {
        controller.error(error);
        source.destroy(
          error instanceof Error ? error : new Error("Media stream failed."),
        );
      }
    },
    async cancel() {
      source.destroy();
      await iterator.return?.();
    },
  });
}

async function* readVerifiedAsset(asset: DownloadAsset) {
  const client = getMediaStorageClient();
  let object;
  try {
    object = await client.send(
      new GetObjectCommand({ Bucket: asset.bucket, Key: asset.objectKey }),
    );
  } catch (error) {
    console.error("Media download object read failed.", {
      assetId: asset.id,
      errorType: errorType(error),
    });
    throw error;
  }

  if (
    !object.Body ||
    object.ContentLength !== Number(asset.sizeBytes) ||
    object.ContentType !== asset.verifiedMimeType
  ) {
    throw new MediaDownloadError(
      422,
      "A selected media file no longer matches its verified metadata.",
    );
  }

  const reader = object.Body.transformToWebStream().getReader();
  let bytesRead = BigInt(0);
  let streamComplete = false;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        streamComplete = true;
        break;
      }
      bytesRead += BigInt(value.byteLength);
      if (bytesRead > asset.sizeBytes) {
        throw new Error("Media storage returned more bytes than expected.");
      }
      yield value;
    }
  } catch (error) {
    console.error("Media download object stream failed.", {
      assetId: asset.id,
      errorType: errorType(error),
    });
    throw error;
  } finally {
    if (!streamComplete) {
      void reader.cancel().catch(() => undefined);
    }
    reader.releaseLock();
  }

  if (bytesRead !== asset.sizeBytes) {
    const error = new Error(
      "Media storage returned fewer bytes than expected.",
    );
    console.error("Media download object stream failed.", {
      assetId: asset.id,
      errorType: errorType(error),
    });
    throw error;
  }
}

async function prepareAssets(
  client: MediaDownloadClient,
  ids: string[],
): Promise<DownloadAsset[]> {
  const rows = await client.mediaAsset.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      objectKey: true,
      bucketAccess: true,
      originalFilename: true,
      verifiedMimeType: true,
      sizeBytes: true,
      publicApprovedAt: true,
      publicApprovedById: true,
    },
  });

  if (rows.length !== ids.length) {
    throw new MediaDownloadError(404, "A selected media asset was not found.");
  }

  const rowsById = new Map(rows.map((asset) => [asset.id, asset]));
  const orderedRows = ids.map((id) => rowsById.get(id));
  if (orderedRows.some((asset) => !asset)) {
    throw new MediaDownloadError(404, "A selected media asset was not found.");
  }

  let totalBytes = BigInt(0);
  const assets = orderedRows.map((asset) => {
    if (!asset || asset.sizeBytes <= BigInt(0)) {
      throw new MediaDownloadError(
        422,
        "A selected media asset has invalid size metadata.",
      );
    }
    totalBytes += asset.sizeBytes;
    return {
      ...asset,
      bucket: getAssetBucket(asset),
      archiveFilename: safeFilename(asset.originalFilename),
    };
  });

  if (totalBytes > BigInt(MAX_MEDIA_DOWNLOAD_BYTES)) {
    throw new MediaDownloadError(
      413,
      "The selected files exceed the 50 MiB download limit.",
    );
  }

  const storage = getMediaStorageClient();
  await Promise.all(
    assets.map(async (asset) => {
      let head;
      try {
        head = await storage.send(
          new HeadObjectCommand({
            Bucket: asset.bucket,
            Key: asset.objectKey,
          }),
        );
      } catch (error) {
        if (isMissingObject(error)) {
          throw new MediaDownloadError(
            422,
            "A selected media file is unavailable in storage.",
          );
        }
        throw error;
      }
      if (
        head.ContentLength !== Number(asset.sizeBytes) ||
        head.ContentType !== asset.verifiedMimeType
      ) {
        throw new MediaDownloadError(
          422,
          "A selected media file no longer matches its verified metadata.",
        );
      }
    }),
  );

  const archiveFilenames = getArchiveFilenames(assets);
  return assets.map((asset, index) => ({
    ...asset,
    archiveFilename: archiveFilenames[index] ?? asset.archiveFilename,
  }));
}

function createSingleDownloadResponse(asset: DownloadAsset): Response {
  const stream = Readable.from(readVerifiedAsset(asset));
  stream.on("error", (error: unknown) => {
    console.error("Media download stream failed.", {
      assetId: asset.id,
      errorType: errorType(error),
    });
  });

  return new Response(toWebStream(stream), {
    headers: assetResponseHeaders(
      asset.archiveFilename,
      "application/octet-stream",
      Number(asset.sizeBytes),
    ),
  });
}

function createArchiveResponse(assets: readonly DownloadAsset[]): Response {
  const archive = new ZipFile();
  const output = new PassThrough();
  archive.outputStream.on("error", (error) => {
    console.error("Media archive generation failed.", {
      errorType: errorType(error),
    });
    output.destroy(
      error instanceof Error ? error : new Error("Media archive failed."),
    );
  });
  archive.outputStream.pipe(output);

  for (const asset of assets) {
    const source = Readable.from(readVerifiedAsset(asset));
    archive.addReadStream(source, asset.archiveFilename, { compress: false });
  }
  archive.end();

  return new Response(toWebStream(output), {
    headers: assetResponseHeaders("media-assets.zip", "application/zip"),
  });
}

export async function queryAdminMediaDownload(
  client: MediaDownloadClient,
  input: unknown,
): Promise<Response> {
  await requireAdmin();
  const ids = parseMediaDownloadIds(input);
  const assets = await prepareAssets(client, ids);

  return assets.length === 1
    ? createSingleDownloadResponse(assets[0]!)
    : createArchiveResponse(assets);
}

export async function downloadAdminMediaAssets(
  input: unknown,
): Promise<Response> {
  return queryAdminMediaDownload(prisma, input);
}
