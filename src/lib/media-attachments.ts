import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  getMediaStorageClient,
  getPrivateMediaBucket,
  getPublicMediaObjectUrl,
} from "./media-storage.ts";
import { inventoryPaginationSchema } from "./inventory-validation.ts";
import { prisma } from "./db.ts";
import { requireSession } from "./session.ts";

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
        sizeBytes: Number(asset.sizeBytes),
        uploadedAt: asset.uploadedAt.toISOString(),
        previewUrl:
          getPublicMediaObjectUrl(asset) ??
          (await getSignedUrl(
            storageClient,
            new GetObjectCommand({
              Bucket: getPrivateMediaBucket(),
              Key: asset.objectKey,
            }),
            { expiresIn: 300 },
          )),
      })),
    ),
    page,
    pageSize,
    hasMore,
  };
}
