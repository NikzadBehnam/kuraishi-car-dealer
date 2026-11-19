import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

import {
  getMediaStorageClient,
  getPrivateMediaBucket,
  getPublicMediaObjectUrl,
} from "./media-storage.ts";
import {
  inventoryIdSchema,
  inventoryPaginationSchema,
  MAX_INVENTORY_SELECTION_SIZE,
} from "./inventory-validation.ts";
import { getPublicVehicleWhere } from "./inventory-eligibility.ts";
import { prisma } from "./db.ts";
import { requireSession } from "./session.ts";
import type { PublicVehicleCardImageDTO } from "../types/inventory.ts";

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

export async function listPublicVehicleMediaAssets(vehicleId: unknown) {
  const id = inventoryIdSchema.parse(vehicleId);
  const attachments = await prisma.vehicleMedia.findMany({
    where: {
      vehicleId: id,
      vehicle: getPublicVehicleWhere("detail"),
      mediaAsset: {
        type: "image",
        bucketAccess: "public_read",
        publicApprovedAt: { not: null },
        publicApprovedById: { not: null },
      },
    },
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

  return {
    assets: attachments.map(({ mediaAsset }) => {
      const previewUrl = getPublicMediaObjectUrl(mediaAsset);
      if (!previewUrl) {
        throw new Error("Approved public media has no public object URL.");
      }
      return {
        id: mediaAsset.id,
        title: mediaAsset.title,
        altText: mediaAsset.altText,
        previewUrl,
      };
    }),
  };
}

const publicVehicleMediaIdsSchema = z
  .array(inventoryIdSchema)
  .max(MAX_INVENTORY_SELECTION_SIZE)
  .refine((ids) => new Set(ids).size === ids.length, {
    message: "Vehicle IDs must be unique.",
  });

export async function listPublicVehicleCardImages(
  vehicleIds: unknown,
): Promise<Map<string, PublicVehicleCardImageDTO[]>> {
  const ids = publicVehicleMediaIdsSchema.parse(vehicleIds);
  const imagesByVehicleId = new Map<string, PublicVehicleCardImageDTO[]>();
  if (ids.length === 0) {
    return imagesByVehicleId;
  }

  const attachments = await prisma.vehicleMedia.findMany({
    where: {
      vehicleId: { in: ids },
      vehicle: getPublicVehicleWhere("catalog"),
      mediaAsset: {
        type: "image",
        bucketAccess: "public_read",
        publicApprovedAt: { not: null },
        publicApprovedById: { not: null },
      },
    },
    orderBy: [{ vehicleId: "asc" }, { position: "asc" }],
    select: {
      vehicleId: true,
      mediaAsset: {
        select: {
          id: true,
          altText: true,
          objectKey: true,
          bucketAccess: true,
          publicApprovedAt: true,
          publicApprovedById: true,
        },
      },
    },
  });

  for (const { vehicleId, mediaAsset } of attachments) {
    const url = getPublicMediaObjectUrl(mediaAsset);
    if (!url) {
      throw new Error("Approved public media has no public object URL.");
    }

    const vehicleImages = imagesByVehicleId.get(vehicleId) ?? [];
    vehicleImages.push({ id: mediaAsset.id, url, altText: mediaAsset.altText });
    imagesByVehicleId.set(vehicleId, vehicleImages);
  }

  return imagesByVehicleId;
}
