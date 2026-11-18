import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  getMediaStorageClient,
  getPrivateMediaBucket,
  getPublicMediaObjectUrl,
} from "./media-storage.ts";
import {
  inventoryIdSchema,
  inventoryPaginationSchema,
} from "./inventory-validation.ts";
import { prisma } from "./db.ts";
import { requireSession } from "./session.ts";

type MediaPreviewAsset = {
  objectKey: string;
  bucketAccess: "private" | "public_read";
  publicApprovedAt: Date | null;
  publicApprovedById: string | null;
};

async function getMediaPreviewUrl(
  storageClient: ReturnType<typeof getMediaStorageClient>,
  asset: MediaPreviewAsset,
) {
  return (
    getPublicMediaObjectUrl(asset) ??
    (await getSignedUrl(
      storageClient,
      new GetObjectCommand({
        Bucket: getPrivateMediaBucket(),
        Key: asset.objectKey,
      }),
      { expiresIn: 300 },
    ))
  );
}

export async function listAttachableMediaAssets(input: unknown) {
  await requireSession();
  const { page, pageSize, skip, take } = inventoryPaginationSchema.parse(input);
  const assets = await prisma.mediaAsset.findMany({
    where: { type: "image", vehicleAttachment: null },
    orderBy: [{ uploadedAt: "desc" }, { id: "desc" }],
    skip,
    take: take + 1,
    select: {
      id: true,
      title: true,
      originalFilename: true,
      altText: true,
      sizeBytes: true,
      uploadedAt: true,
      objectKey: true,
      bucketAccess: true,
      publicApprovedAt: true,
      publicApprovedById: true,
    },
  });
  const hasMore = assets.length > take;
  const pageAssets = assets.slice(0, take);
  const storageClient = getMediaStorageClient();

  return {
    assets: await Promise.all(
      pageAssets.map(async (asset) => ({
        id: asset.id,
        title: asset.title,
        filename: asset.originalFilename,
        altText: asset.altText,
        isPublicApproved:
          asset.bucketAccess === "public_read" &&
          asset.publicApprovedAt !== null &&
          asset.publicApprovedById !== null,
        sizeBytes: Number(asset.sizeBytes),
        uploadedAt: asset.uploadedAt.toISOString(),
        previewUrl: await getMediaPreviewUrl(storageClient, asset),
      })),
    ),
    page,
    pageSize,
    hasMore,
  };
}

export async function listVehicleMediaAssets(vehicleId: unknown) {
  await requireSession();
  const id = inventoryIdSchema.parse(vehicleId);
  const attachments = await prisma.vehicleMedia.findMany({
    where: { vehicleId: id },
    orderBy: { position: "asc" },
    select: {
      mediaAsset: {
        select: {
          id: true,
          title: true,
          altText: true,
          objectKey: true,
          bucketAccess: true,
          publicApprovedAt: true,
          publicApprovedById: true,
        },
      },
    },
  });
  const storageClient = getMediaStorageClient();

  return {
    assets: await Promise.all(
      attachments.map(async ({ mediaAsset }) => ({
        id: mediaAsset.id,
        title: mediaAsset.title,
        altText: mediaAsset.altText,
        isPublicApproved:
          mediaAsset.bucketAccess === "public_read" &&
          mediaAsset.publicApprovedAt !== null &&
          mediaAsset.publicApprovedById !== null,
        previewUrl: await getMediaPreviewUrl(storageClient, mediaAsset),
      })),
    ),
  };
}
