import "server-only";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import type { PrismaClient } from "../generated/prisma/client.ts";

import { prisma } from "./db.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
  getPublicMediaBucket,
} from "./media-storage.ts";
import {
  parseMediaDeletionIds,
  type MediaDeletionResult,
} from "./media-delete-validation.ts";
import { requireAdmin } from "./session.ts";

type MediaDeletionClient = Pick<PrismaClient, "$transaction">;

function errorType(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

function getAssetBucket(asset: {
  bucketAccess: "private" | "public_read";
  publicApprovedAt: Date | null;
  publicApprovedById: string | null;
}): string {
  if (asset.bucketAccess === "private") {
    return getPrivateMediaBucket();
  }
  if (!asset.publicApprovedAt || !asset.publicApprovedById) {
    throw new Error("Public media requires a recorded approval.");
  }
  return getPublicMediaBucket();
}

async function deleteAsset(
  client: MediaDeletionClient,
  id: string,
): Promise<MediaDeletionResult> {
  let filename = "";
  try {
    return await client.$transaction(
      async (tx) => {
        const locked = await tx.$queryRaw<{ id: string }[]>`
          SELECT "id" FROM "MediaAsset" WHERE "id" = ${id} FOR UPDATE
        `;
        if (locked.length === 0) {
          return {
            id,
            filename,
            status: "not_found",
            message: "Media asset was not found.",
          };
        }

        const asset = await tx.mediaAsset.findUnique({
          where: { id },
          select: {
            id: true,
            objectKey: true,
            bucketAccess: true,
            originalFilename: true,
            publicApprovedAt: true,
            publicApprovedById: true,
            vehicleAttachment: {
              select: {
                vehicle: { select: { make: true, model: true } },
              },
            },
          },
        });
        if (!asset) {
          return {
            id,
            filename,
            status: "not_found",
            message: "Media asset was not found.",
          };
        }

        filename = asset.originalFilename;
        const vehicle = asset.vehicleAttachment?.vehicle;
        if (vehicle) {
          return {
            id,
            filename,
            status: "in_use",
            message: `Attached to ${vehicle.make} ${vehicle.model}; detach or replace it first.`,
          };
        }

        const bucket = getAssetBucket(asset);
        // Keep the row lock until storage and database deletion both finish.
        await getMediaStorageClient().send(
          new DeleteObjectCommand({ Bucket: bucket, Key: asset.objectKey }),
        );
        await tx.mediaAsset.delete({ where: { id } });

        return {
          id,
          filename,
          status: "deleted",
          message: "Media asset deleted.",
        };
      },
      { timeout: 30_000 },
    );
  } catch (error) {
    console.error("Media asset deletion failed.", {
      assetId: id,
      errorType: errorType(error),
    });
    return {
      id,
      filename,
      status: "failed",
      message: "Could not complete deletion; verify the asset before retrying.",
    };
  }
}

export async function queryAdminMediaDeletions(
  client: MediaDeletionClient,
  input: unknown,
): Promise<{ results: MediaDeletionResult[] }> {
  await requireAdmin();
  const ids = parseMediaDeletionIds(input);
  const results: MediaDeletionResult[] = [];

  for (const id of ids) {
    results.push(await deleteAsset(client, id));
  }

  return { results };
}

export async function deleteAdminMediaAssets(input: unknown) {
  return queryAdminMediaDeletions(prisma, input);
}
