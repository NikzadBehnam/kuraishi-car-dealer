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
import { requireSession } from "./session.ts";
import {
  completeMediaUploadSchema,
  detectMediaMimeType,
  getMediaExtension,
  MEDIA_UPLOAD_INTENT_TTL_SECONDS,
  MEDIA_UPLOAD_URL_TTL_SECONDS,
  mediaUploadBatchSchema,
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

type CompletedMediaAsset = {
  id: string;
  type: string;
  title: string;
  originalFilename: string;
  verifiedMimeType: string;
  sizeBytes: number;
  uploadedAt: string;
};

function serializeAsset(asset: {
  id: string;
  type: string;
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

async function finishStorageCleanup(
  uploadId: string,
  stagingKey: string,
  bucket: string,
): Promise<boolean> {
  try {
    await getMediaStorageClient().send(
      new DeleteObjectCommand({ Bucket: bucket, Key: stagingKey }),
    );
    await prisma.mediaUploadIntent.deleteMany({ where: { id: uploadId } });
    return false;
  } catch (error) {
    console.error("Completed media upload cleanup is pending.", {
      uploadId,
      errorType: storageErrorName(error),
    });
    return true;
  }
}

export async function createMediaUploadIntents(input: unknown) {
  const session = await requireSession();
  const { files } = mediaUploadBatchSchema.parse(input);
  const client = getMediaStorageClient();
  const bucket = getPrivateMediaBucket();
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

  return { uploads: intents.map(({ response }) => response) };
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
      cleanupPending: await finishStorageCleanup(
        uploadId,
        `incoming/${uploadId}`,
        getPrivateMediaBucket(),
      ),
    };
  }

  const completedAsset = await findOwnedCompletedAsset(
    intent.id,
    session.user.id,
  );
  const bucket = getPrivateMediaBucket();
  if (completedAsset) {
    return {
      asset: completedAsset,
      cleanupPending: await finishStorageCleanup(
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
      await tx.mediaUploadIntent.update({
        where: { id: intent.id },
        data: { completedAt: new Date() },
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
          cleanupPending: await finishStorageCleanup(
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
    cleanupPending: await finishStorageCleanup(
      intent.id,
      intent.stagingKey,
      bucket,
    ),
  };
}
