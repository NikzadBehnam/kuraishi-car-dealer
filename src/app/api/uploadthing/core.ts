import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import type { Prisma } from "@/generated/prisma/client";
import { mediaUploadLimits } from "@/features/media/constants.ts";
import { buildDefaultMediaTitle } from "@/features/media/mappers.ts";
import { getMediaProvider } from "@/features/media/server/provider.ts";
import {
  assertCapability,
  authCapabilities,
} from "@/lib/auth/authorization-policy.ts";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

const upload = createUploadthing();

export const uploadRouter = {
  mediaLibraryImages: upload({
    image: {
      maxFileCount: mediaUploadLimits.maxFileCount,
      maxFileSize: mediaUploadLimits.maxFileSize,
    },
  })
    .middleware(async ({ req }) => {
      try {
        const session = assertCapability(
          await auth.api.getSession({ headers: req.headers }),
          authCapabilities.manageVehicleMedia,
        );

        return {
          actorEmail: session.user.email,
          actorName: session.user.name,
          actorRole: session.user.role ?? null,
          userId: session.user.id,
        };
      } catch {
        throw new UploadThingError(
          "You do not have permission to upload media.",
        );
      }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        const asset = await persistUploadedFile({ file, metadata });

        return {
          assetId: asset.id,
          title: asset.title,
          url: asset.url,
        };
      } catch {
        try {
          await getMediaProvider().deleteFiles([file.key]);
        } catch {
          // Preserve the persistence failure; cleanup is compensating only.
        }

        throw new UploadThingError(
          "The uploaded file could not be saved to the media library.",
        );
      }
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;

type UploadMetadata = {
  actorEmail: string;
  actorName: string;
  actorRole: string | null;
  userId: string;
};

type UploadedFile = {
  key: string;
  name: string;
  size: number;
  type: string;
  ufsUrl: string;
};

async function persistUploadedFile({
  file,
  metadata,
}: {
  file: UploadedFile;
  metadata: UploadMetadata;
}) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.mediaAsset.findUnique({
      where: {
        provider_providerAssetId: {
          provider: "uploadthing",
          providerAssetId: file.key,
        },
      },
      select: { id: true, title: true, url: true },
    });

    if (existing) return existing;

    const title = buildDefaultMediaTitle(file.name);
    const asset = await transaction.mediaAsset.create({
      data: {
        provider: "uploadthing",
        providerAssetId: file.key,
        url: file.ufsUrl,
        originalFilename: file.name,
        mimeType: file.type,
        sizeBytes: BigInt(file.size),
        title,
        uploadedByUserId: metadata.userId,
      },
      select: { id: true, title: true, url: true },
    });

    await transaction.activityEvent.create({
      data: buildMediaUploadedActivityEvent({
        asset,
        file,
        metadata,
      }),
    });

    return asset;
  });
}

function buildMediaUploadedActivityEvent({
  asset,
  file,
  metadata,
}: {
  asset: { id: string; title: string };
  file: UploadedFile;
  metadata: UploadMetadata;
}): Prisma.ActivityEventUncheckedCreateInput {
  return {
    actorName: metadata.actorName || metadata.actorEmail,
    actorRole: metadata.actorRole,
    actorUserId: metadata.userId,
    metadata: {
      mimeType: file.type,
      provider: "uploadthing",
      providerAssetId: file.key,
      sizeBytes: file.size,
    },
    severity: "success",
    summary: `Uploaded media asset ${asset.title}.`,
    targetId: asset.id,
    targetLabel: asset.title,
    targetType: "media",
    type: "media.uploaded",
  };
}
