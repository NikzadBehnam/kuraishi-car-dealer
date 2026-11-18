import "server-only";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { Prisma } from "../generated/prisma/client.ts";
import { z } from "zod";

import { prisma } from "./db.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
  getPublicMediaBucket,
} from "./media-storage.ts";
import { inventoryIdSchema } from "./inventory-validation.ts";
import { requireAdmin } from "./session.ts";

const approvePublicMediaSchema = z.strictObject({
  mediaAssetId: inventoryIdSchema,
});

export class MediaApprovalError extends Error {
  readonly status: 404 | 409 | 422 | 503;

  constructor(status: MediaApprovalError["status"], message: string) {
    super(message);
    this.name = "MediaApprovalError";
    this.status = status;
  }
}

function isMissingObject(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "NotFound" ||
      error.name === "NoSuchKey" ||
      error.name === "NoSuchBucket")
  );
}

function objectExtension(mimeType: string): string {
  return mimeType === "image/png" ? "png" : "jpg";
}

function copySource(bucket: string, key: string): string {
  return `/${bucket}/${key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

function approvalCopyKey(sourceId: string, mimeType: string): string {
  return `approved/${sourceId}.${objectExtension(mimeType)}`;
}

export async function approvePublicMediaAsset(input: unknown) {
  const session = await requireAdmin();
  const { mediaAssetId } = approvePublicMediaSchema.parse(input);
  const source = await prisma.mediaAsset.findUnique({
    where: { id: mediaAssetId },
    select: {
      id: true,
      objectKey: true,
      bucketAccess: true,
      type: true,
      title: true,
      originalFilename: true,
      altText: true,
      verifiedMimeType: true,
      sizeBytes: true,
      width: true,
      height: true,
    },
  });
  if (!source) {
    throw new MediaApprovalError(404, "Media asset was not found.");
  }
  if (source.type !== "image") {
    throw new MediaApprovalError(422, "Only image assets can be approved.");
  }
  if (!["image/jpeg", "image/png"].includes(source.verifiedMimeType)) {
    throw new MediaApprovalError(
      422,
      "Only verified JPEG or PNG images can be approved.",
    );
  }
  if (source.bucketAccess !== "private") {
    throw new MediaApprovalError(
      409,
      "Only private images can be approved for public access.",
    );
  }

  const objectKey = approvalCopyKey(source.id, source.verifiedMimeType);
  const uniqueKey = {
    bucketAccess_objectKey: {
      bucketAccess: "public_read" as const,
      objectKey,
    },
  };
  const findExistingCopy = () =>
    prisma.mediaAsset.findUnique({
      where: uniqueKey,
      select: {
        id: true,
        objectKey: true,
        type: true,
        verifiedMimeType: true,
        sizeBytes: true,
        publicApprovedAt: true,
        publicApprovedById: true,
      },
    });
  type ExistingCopy = NonNullable<Awaited<ReturnType<typeof findExistingCopy>>>;
  const client = getMediaStorageClient();
  const publicBucket = getPublicMediaBucket();
  const resolveExistingCopy = async (existing: ExistingCopy) => {
    if (
      existing.type !== "image" ||
      existing.objectKey !== objectKey ||
      existing.verifiedMimeType !== source.verifiedMimeType ||
      existing.sizeBytes !== source.sizeBytes ||
      !existing.publicApprovedAt ||
      !existing.publicApprovedById
    ) {
      throw new MediaApprovalError(
        409,
        "The existing public copy does not have a valid approval record.",
      );
    }

    let publicHead;
    try {
      publicHead = await client.send(
        new HeadObjectCommand({ Bucket: publicBucket, Key: objectKey }),
      );
    } catch (error) {
      if (isMissingObject(error)) {
        throw new MediaApprovalError(
          422,
          "The approved public image is missing from storage.",
        );
      }
      throw error;
    }
    if (
      publicHead.ContentLength !== Number(source.sizeBytes) ||
      publicHead.ContentType !== source.verifiedMimeType
    ) {
      throw new MediaApprovalError(
        422,
        "The approved public image no longer matches its verified metadata.",
      );
    }
    return {
      sourceMediaAssetId: source.id,
      publicMediaAssetId: existing.id,
      reused: true,
    };
  };
  const existing = await findExistingCopy();
  if (existing) {
    return resolveExistingCopy(existing);
  }

  const sourceBucket = getPrivateMediaBucket();
  let sourceHead;
  try {
    sourceHead = await client.send(
      new HeadObjectCommand({ Bucket: sourceBucket, Key: source.objectKey }),
    );
  } catch (error) {
    if (isMissingObject(error)) {
      throw new MediaApprovalError(
        422,
        "The private image is missing from storage.",
      );
    }
    throw error;
  }
  if (
    sourceHead.ContentLength !== Number(source.sizeBytes) ||
    sourceHead.ContentType !== source.verifiedMimeType
  ) {
    throw new MediaApprovalError(
      422,
      "The private image no longer matches its verified metadata.",
    );
  }

  let copyAttempted = false;
  try {
    copyAttempted = true;
    await client.send(
      new CopyObjectCommand({
        Bucket: publicBucket,
        Key: objectKey,
        CopySource: copySource(sourceBucket, source.objectKey),
        MetadataDirective: "REPLACE",
        ContentType: source.verifiedMimeType,
      }),
    );
    const publicHead = await client.send(
      new HeadObjectCommand({ Bucket: publicBucket, Key: objectKey }),
    );
    if (
      publicHead.ContentLength !== Number(source.sizeBytes) ||
      publicHead.ContentType !== source.verifiedMimeType
    ) {
      throw new MediaApprovalError(
        422,
        "The public copy does not match the verified image metadata.",
      );
    }

    const approvedAt = new Date();
    const publicCopy = await prisma.mediaAsset.create({
      data: {
        objectKey,
        bucketAccess: "public_read",
        type: "image",
        title: source.title,
        originalFilename: source.originalFilename,
        altText: source.altText,
        verifiedMimeType: source.verifiedMimeType,
        sizeBytes: source.sizeBytes,
        width: source.width,
        height: source.height,
        uploadedById: session.user.id,
        publicApprovedAt: approvedAt,
        publicApprovedById: session.user.id,
      },
      select: { id: true },
    });

    return {
      sourceMediaAssetId: source.id,
      publicMediaAssetId: publicCopy.id,
      reused: false,
    };
  } catch (error) {
    let existingCopy;
    try {
      existingCopy = await findExistingCopy();
    } catch (lookupError) {
      console.error("Could not verify a public media approval.", {
        sourceMediaAssetId: source.id,
        errorType:
          lookupError instanceof Error ? lookupError.name : "UnknownError",
      });
      throw new MediaApprovalError(
        503,
        "Could not verify the public copy; check the media library before retrying.",
      );
    }
    if (existingCopy) {
      return resolveExistingCopy(existingCopy);
    }

    if (copyAttempted) {
      try {
        await client.send(
          new DeleteObjectCommand({ Bucket: publicBucket, Key: objectKey }),
        );
      } catch (cleanupError) {
        console.error("Public media approval cleanup failed.", {
          sourceMediaAssetId: source.id,
          errorType:
            cleanupError instanceof Error ? cleanupError.name : "UnknownError",
        });
        throw new MediaApprovalError(
          503,
          "Approval failed and the public copy could not be cleaned up.",
        );
      }
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new MediaApprovalError(
        409,
        "A public copy already exists for this image.",
      );
    }
    throw error;
  }
}
