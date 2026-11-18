import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Prisma, type PrismaClient } from "../generated/prisma/client.ts";
import type {
  AdminMediaAsset,
  AdminMediaType,
  AdminMediaUsage,
  AdminMediaLibraryPage,
} from "../types/admin.ts";
import { prisma } from "./db.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
  getPublicMediaObjectUrl,
} from "./media-storage.ts";
import { parseMediaLibraryQuery } from "./media-library-validation.ts";
import { requireAdmin } from "./session.ts";

type MediaLibraryClient = Pick<PrismaClient, "mediaAsset">;

const mediaTypes: readonly AdminMediaType[] = ["image", "document", "brand"];
const mediaUsages: readonly AdminMediaUsage[] = [
  "vehicle",
  "brand",
  "legal",
  "unused",
];

function getUsageWhere(usage: AdminMediaUsage): Prisma.MediaAssetWhereInput {
  switch (usage) {
    case "vehicle":
      return { vehicleAttachment: { isNot: null } };
    case "brand":
      return { type: "brand" };
    case "legal":
      return { type: "document" };
    case "unused":
      return { type: "image", vehicleAttachment: { is: null } };
  }
}

function getMediaLibraryWhere({
  search,
  type,
  usage,
}: ReturnType<typeof parseMediaLibraryQuery>): Prisma.MediaAssetWhereInput {
  const filters: Prisma.MediaAssetWhereInput[] = [];

  if (type !== "all") {
    filters.push({ type });
  }
  if (usage !== "all") {
    filters.push(getUsageWhere(usage));
  }

  const terms = search.toLocaleLowerCase("de").split(/\s+/).filter(Boolean);
  for (const term of terms) {
    const matches: Prisma.MediaAssetWhereInput[] = [
      { title: { contains: term, mode: "insensitive" } },
      { originalFilename: { contains: term, mode: "insensitive" } },
      { altText: { contains: term, mode: "insensitive" } },
      {
        vehicleAttachment: {
          is: {
            vehicle: {
              OR: [
                { make: { contains: term, mode: "insensitive" } },
                { model: { contains: term, mode: "insensitive" } },
                { slug: { contains: term, mode: "insensitive" } },
                { stockNumber: { contains: term, mode: "insensitive" } },
              ],
            },
          },
        },
      },
    ];

    for (const mediaType of mediaTypes) {
      if (mediaType.includes(term)) {
        matches.push({ type: mediaType });
      }
    }
    for (const mediaUsage of mediaUsages) {
      if (mediaUsage.includes(term)) {
        matches.push(getUsageWhere(mediaUsage));
      }
    }
    filters.push({ OR: matches });
  }

  return filters.length > 0 ? { AND: filters } : {};
}

function getAssetUsage(asset: {
  type: AdminMediaType;
  hasVehicleAttachment: boolean;
}): AdminMediaUsage {
  if (asset.hasVehicleAttachment) {
    return "vehicle";
  }
  if (asset.type === "brand") {
    return "brand";
  }
  if (asset.type === "document") {
    return "legal";
  }
  return "unused";
}

async function getAssetUrl(asset: {
  objectKey: string;
  bucketAccess: "private" | "public_read";
  publicApprovedAt: Date | null;
  publicApprovedById: string | null;
}) {
  const publicUrl = getPublicMediaObjectUrl(asset);
  if (publicUrl) {
    return publicUrl;
  }

  return getSignedUrl(
    getMediaStorageClient(),
    new GetObjectCommand({
      Bucket: getPrivateMediaBucket(),
      Key: asset.objectKey,
    }),
    { expiresIn: 300 },
  );
}

export async function queryMediaLibraryAssets(
  client: MediaLibraryClient,
  input: unknown,
): Promise<AdminMediaLibraryPage> {
  await requireAdmin();
  const query = parseMediaLibraryQuery(input);
  const rows = await client.mediaAsset.findMany({
    where: getMediaLibraryWhere(query),
    orderBy: [{ uploadedAt: "desc" }, { id: "asc" }],
    skip: query.skip,
    take: query.take + 1,
    select: {
      id: true,
      type: true,
      title: true,
      originalFilename: true,
      altText: true,
      sizeBytes: true,
      width: true,
      height: true,
      uploadedAt: true,
      objectKey: true,
      bucketAccess: true,
      publicApprovedAt: true,
      publicApprovedById: true,
      vehicleAttachment: {
        select: {
          vehicle: {
            select: { id: true, make: true, model: true },
          },
        },
      },
    },
  });

  const hasMore = rows.length > query.take;
  const pageRows = rows.slice(0, query.take);
  const assets = await Promise.all(
    pageRows.map(async (asset): Promise<AdminMediaAsset> => {
      const vehicle = asset.vehicleAttachment?.vehicle;
      return {
        id: asset.id,
        type: asset.type,
        usage: getAssetUsage({
          type: asset.type,
          hasVehicleAttachment: asset.vehicleAttachment !== null,
        }),
        title: asset.title,
        filename: asset.originalFilename,
        url: await getAssetUrl(asset),
        alt: asset.altText ?? "",
        sizeKb: Math.ceil(Number(asset.sizeBytes) / 1024),
        ...(asset.width === null ? {} : { width: asset.width }),
        ...(asset.height === null ? {} : { height: asset.height }),
        ...(vehicle
          ? {
              usedByVehicleId: vehicle.id,
              usedByVehicle: vehicle,
            }
          : {}),
        uploadedAt: asset.uploadedAt.toISOString(),
      };
    }),
  );

  return {
    assets,
    page: query.page,
    pageSize: query.pageSize,
    hasMore,
  };
}

export async function listAdminMediaAssets(
  input: unknown,
): Promise<AdminMediaLibraryPage> {
  return queryMediaLibraryAssets(prisma, input);
}
