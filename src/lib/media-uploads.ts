import "server-only";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client.ts";

import { prisma } from "./db.ts";
import { requireAdmin, requireSession } from "./session.ts";
import {
  completeMediaUploadSchema,
  detectMediaMimeType,
  getMediaExtension,
  MEDIA_UPLOAD_INTENT_TTL_SECONDS,
  MEDIA_UPLOAD_URL_TTL_SECONDS,
  mediaUploadBatchSchema,
  type CompletedMediaAsset,
} from "./media-upload-validation.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
} from "./media-storage.ts";

export class MediaUploadError extends Error {
  readonly status: 400 | 404 | 409 | 410 | 422;

  constructor(status: 400 | 404 | 409 | 410 | 422, message: string) {
    super(message);
    this.name = "MediaUploadError";
    this.status = status;
  }
}

type CleanupReport = {
  scanned: number;
  cleaned: number;
  failed: number;
};

function serializeAsset(asset: {
  id: string;
  type: CompletedMediaAsset["type"];
  title: string;
  originalFilename: string;
  verifiedMimeType: string;
  sizeBytes: bigint;
  uploadedAt: Date;
}): CompletedMediaAsset {
  return {
    id: asset.id,
    type: asset.type,
    title: asset.title,
    originalFilename: asset.originalFilename,
    verifiedMimeType: asset.verifiedMimeType,
    sizeBytes: Number(asset.sizeBytes),
    uploadedAt: asset.uploadedAt.toISOString(),
  };
}

function isMissingObject(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "NotFound" || error.name === "NoSuchKey")
  );
}

function storageErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function copySource(bucket: string, key: string): string {
  return `/${bucket}/${key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function findOwnedCompletedAsset(uploadId: string, userId: string) {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id: uploadId, uploadedById: userId },
  });
  return asset ? serializeAsset(asset) : null;
}

async function cleanupCompletedStaging(
  uploadId: string,
  stagingKey: string,
  bucket: string,
): Promise<boolean> {
  try {
    await getMediaStorageClient().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: stagingKey }),
    );
    return false;
  } catch (error) {
    console.error("Completed media upload cleanup is pending.", {
      uploadId,
      errorType: storageErrorName(error),
    });
    return true;
  }
}

async function cleanupCancelledObjects(
  intent: { id: string; stagingKey: string; objectKey: string },
  bucket: string,
): Promise<boolean> {
  try {
    const client = getMediaStorageClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: intent.stagingKey }),
    );
    await client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: intent.objectKey }),
    );
    return false;
  } catch (error) {
    console.error("Cancelled media upload cleanup is pending.", {
      uploadId: intent.id,
      errorType: storageErrorName(error),
    });
    return true;
  }
}

async function sweepExpiredMediaUploadIntents(
  limit: number,
): Promise<CleanupReport> {
  const now = new Date();
  const expiredIntents = await prisma.mediaUploadIntent.findMany({
    where: { expiresAt: { lte: now } },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });
  const report: CleanupReport = {
    scanned: expiredIntents.length,
    cleaned: 0,
    failed: 0,
  };

  for (const candidate of expiredIntents) {
    try {
      let intent = candidate;
      if (!intent.completedAt && !intent.cancelledAt) {
        const cancelledAt = new Date();
        const claimed = await prisma.mediaUploadIntent.updateMany({
          where: {
            id: intent.id,
            completedAt: null,
            cancelledAt: null,
            expiresAt: { lte: now },
          },
          data: { cancelledAt },
        });
        if (claimed.count === 1) {
          intent = { ...intent, cancelledAt };
        } else {
          const current = await prisma.mediaUploadIntent.findUnique({
            where: { id: intent.id },
          });
          if (!current) {
            continue;
          }
          intent = current;
        }
      }

      if (intent.expiresAt.getTime() > now.getTime()) {
        continue;
      }

      const asset = await prisma.mediaAsset.findUnique({
        where: { id: intent.id },
        select: { id: true },
      });
      const client = getMediaStorageClient();
      const bucket = getPrivateMediaBucket();
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: intent.stagingKey }),
      );
      if (!asset) {
        await client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: intent.objectKey }),
        );
      }

      const deleted = await prisma.mediaUploadIntent.deleteMany({
        where: {
          id: intent.id,
          expiresAt: { lte: now },
          completedAt: intent.completedAt,
          cancelledAt: intent.cancelledAt,
        },
      });
      report.cleaned += deleted.count;
    } catch (error) {
      report.failed += 1;
      console.error("Expired media upload cleanup is pending.", {
        uploadId: candidate.id,
        errorType: storageErrorName(error),
      });
    }
  }

  return report;
}

export async function createMediaUploadIntents(input: unknown) {
  const session = await requireSession();
  const { files } = mediaUploadBatchSchema.parse(input);
  const client = getMediaStorageClient();
  const bucket = getPrivateMediaBucket();
  const cleanup = await sweepExpiredMediaUploadIntents(5);
  const expiresAt = new Date(
    Date.now() + MEDIA_UPLOAD_INTENT_TTL_SECONDS * 1000,
  );

  const intents = await Promise.all(
    files.map(async (file) => {
      const id = randomUUID();
      const stagingKey = `incoming/${id}`;
      const objectKey = `assets/${id}.${getMediaExtension(file.contentType)}`;
      const post = await createPresignedPost(client, {
        Bucket: bucket,
        Key: stagingKey,
        Conditions: [
          ["content-length-range", file.sizeBytes, file.sizeBytes],
          ["eq", "$Content-Type", file.contentType],
          ["eq", "$key", stagingKey],
        ],
        Fields: { "Content-Type": file.contentType },
        Expires: MEDIA_UPLOAD_URL_TTL_SECONDS,
      });

      return {
        database: {
          id,
          objectKey,
          stagingKey,
          type: file.type,
          title: file.title ?? file.originalFilename,
          originalFilename: file.originalFilename,
          altText: file.altText,
          claimedMimeType: file.contentType,
          sizeBytes: BigInt(file.sizeBytes),
          uploadedById: session.user.id,
          expiresAt,
        },
        response: {
          uploadId: id,
          url: post.url,
          method: "POST" as const,
          fields: post.fields,
        },
      };
    }),
  );

  await prisma.mediaUploadIntent.createMany({
    data: intents.map(({ database }) => database),
  });

  return { uploads: intents.map(({ response }) => response), cleanup };
}

export async function cancelMediaUploadIntent(input: unknown) {
  const session = await requireSession();
  const { uploadId } = completeMediaUploadSchema.parse(input);
  const intent = await prisma.mediaUploadIntent.findFirst({
    where: { id: uploadId, uploadedById: session.user.id },
  });

  if (!intent) {
    if (await findOwnedCompletedAsset(uploadId, session.user.id)) {
      throw new MediaUploadError(409, "Completed uploads cannot be cancelled.");
    }
    throw new MediaUploadError(404, "Upload intent was not found.");
  }
  if (intent.completedAt) {
    throw new MediaUploadError(409, "Completed uploads cannot be cancelled.");
  }

  let cancelledIntent = intent;
  if (!intent.cancelledAt) {
    const cancelledAt = new Date();
    const transition = await prisma.mediaUploadIntent.updateMany({
      where: {
        id: intent.id,
        uploadedById: session.user.id,
        completedAt: null,
        cancelledAt: null,
      },
      data: { cancelledAt },
    });
    if (transition.count !== 1) {
      const current = await prisma.mediaUploadIntent.findFirst({
        where: { id: intent.id, uploadedById: session.user.id },
      });
      if (!current) {
        throw new MediaUploadError(404, "Upload intent was not found.");
      }
      if (current.completedAt) {
        throw new MediaUploadError(
          409,
          "Completed uploads cannot be cancelled.",
        );
      }
      if (!current.cancelledAt) {
        throw new MediaUploadError(409, "Upload intent is no longer active.");
      }
      cancelledIntent = current;
    } else {
      cancelledIntent = { ...intent, cancelledAt };
    }
  }

  return {
    cancelled: true,
    cleanupPending: await cleanupCancelledObjects(
      cancelledIntent,
      getPrivateMediaBucket(),
    ),
  };
}

export async function cleanupExpiredMediaUploadIntents() {
  await requireAdmin();
  return sweepExpiredMediaUploadIntents(100);
}

export async function completeMediaUploadIntent(input: unknown) {
  const session = await requireSession();
  const { uploadId } = completeMediaUploadSchema.parse(input);
  const intent = await prisma.mediaUploadIntent.findFirst({
    where: { id: uploadId, uploadedById: session.user.id },
  });

  if (!intent) {
    const completedAsset = await findOwnedCompletedAsset(
      uploadId,
      session.user.id,
    );
    if (!completedAsset) {
      throw new MediaUploadError(404, "Upload intent was not found.");
    }
    return {
      asset: completedAsset,
      cleanupPending: await cleanupCompletedStaging(
        uploadId,
        `incoming/${uploadId}`,
        getPrivateMediaBucket(),
      ),
    };
  }

  if (intent.cancelledAt) {
    throw new MediaUploadError(409, "Upload intent has been cancelled.");
  }

  const completedAsset = await findOwnedCompletedAsset(
    intent.id,
    session.user.id,
  );
  const bucket = getPrivateMediaBucket();
  if (completedAsset) {
    return {
      asset: completedAsset,
      cleanupPending: await cleanupCompletedStaging(
        intent.id,
        intent.stagingKey,
        bucket,
      ),
    };
  }

  if (intent.expiresAt.getTime() <= Date.now()) {
    throw new MediaUploadError(410, "Upload intent has expired.");
  }

  const client = getMediaStorageClient();
  let head;
  try {
    head = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: intent.stagingKey }),
    );
  } catch (error) {
    if (isMissingObject(error)) {
      throw new MediaUploadError(409, "Upload the file before completing it.");
    }
    throw error;
  }

  if (
    head.ContentLength !== Number(intent.sizeBytes) ||
    head.ContentType !== intent.claimedMimeType
  ) {
    throw new MediaUploadError(
      422,
      "Uploaded file metadata does not match the authorized upload.",
    );
  }

  const content = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: intent.stagingKey,
      Range: "bytes=0-1023",
    }),
  );
  const prefix = await content.Body?.transformToByteArray();
  if (!prefix || detectMediaMimeType(prefix) !== intent.claimedMimeType) {
    throw new MediaUploadError(
      422,
      "Uploaded file contents do not match an allowed file type.",
    );
  }

  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: intent.objectKey,
      CopySource: copySource(bucket, intent.stagingKey),
      MetadataDirective: "REPLACE",
      ContentType: intent.claimedMimeType,
    }),
  );

  let asset;
  try {
    asset = await prisma.$transaction(async (tx) => {
      const transition = await tx.mediaUploadIntent.updateMany({
        where: {
          id: intent.id,
          uploadedById: session.user.id,
          completedAt: null,
          cancelledAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { completedAt: new Date() },
      });
      if (transition.count !== 1) {
        throw new MediaUploadError(409, "Upload intent is no longer active.");
      }

      const createdAsset = await tx.mediaAsset.create({
        data: {
          id: intent.id,
          objectKey: intent.objectKey,
          bucketAccess: "private",
          type: intent.type,
          title: intent.title,
          originalFilename: intent.originalFilename,
          altText: intent.altText,
          verifiedMimeType: intent.claimedMimeType,
          sizeBytes: intent.sizeBytes,
          uploadedById: intent.uploadedById,
        },
      });
      return createdAsset;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingAsset = await findOwnedCompletedAsset(
        intent.id,
        session.user.id,
      );
      if (existingAsset) {
        return {
          asset: existingAsset,
          cleanupPending: await cleanupCompletedStaging(
            intent.id,
            intent.stagingKey,
            bucket,
          ),
        };
      }
    }
    throw error;
  }

  return {
    asset: serializeAsset(asset),
    cleanupPending: await cleanupCompletedStaging(
      intent.id,
      intent.stagingKey,
      bucket,
    ),
  };
}
