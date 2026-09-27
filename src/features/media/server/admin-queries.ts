import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import {
  createPaginatedResult,
  type PaginatedResult,
} from "@/features/shared/pagination.ts";
import { authCapabilities, requireCapability } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

import type { AdminMediaAssetDto } from "../dto.ts";
import { toAdminMediaAssetDto } from "../mappers.ts";
import {
  adminMediaListQuerySchema,
  type AdminMediaListQuery,
} from "../schemas.ts";

const adminMediaAssetSelect = {
  id: true,
  provider: true,
  providerAssetId: true,
  url: true,
  originalFilename: true,
  mimeType: true,
  sizeBytes: true,
  width: true,
  height: true,
  title: true,
  altText: true,
  createdAt: true,
  updatedAt: true,
  vehicle: {
    select: {
      id: true,
      make: true,
      model: true,
      variant: true,
      stockNumber: true,
    },
  },
  uploadedBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} satisfies Prisma.MediaAssetSelect;

export async function listAdminMediaAssets(
  input: unknown = {},
): Promise<PaginatedResult<AdminMediaAssetDto>> {
  await requireCapability(authCapabilities.manageVehicleMedia);

  const query = adminMediaListQuerySchema.parse(input);
  const where = buildAdminMediaWhere(query);
  const skip = (query.page - 1) * query.pageSize;

  const [assets, total] = await prisma.$transaction([
    prisma.mediaAsset.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip,
      take: query.pageSize,
      select: adminMediaAssetSelect,
    }),
    prisma.mediaAsset.count({ where }),
  ]);

  return createPaginatedResult(
    assets.map(toAdminMediaAssetDto),
    query.page,
    query.pageSize,
    total,
  );
}

function buildAdminMediaWhere(
  query: AdminMediaListQuery,
): Prisma.MediaAssetWhereInput {
  const conditions: Prisma.MediaAssetWhereInput[] = [];

  if (query.type === "image") {
    conditions.push({ mimeType: { startsWith: "image/" } });
  } else if (query.type === "document") {
    conditions.push({ NOT: { mimeType: { startsWith: "image/" } } });
  }

  if (query.usage === "vehicle") {
    conditions.push({ vehicleId: { not: null } });
  } else if (query.usage === "unused") {
    conditions.push({ vehicleId: null });
  }

  if (query.search) {
    conditions.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        {
          originalFilename: {
            contains: query.search,
            mode: "insensitive",
          },
        },
        { altText: { contains: query.search, mode: "insensitive" } },
        {
          vehicle: {
            is: {
              OR: [
                { make: { contains: query.search, mode: "insensitive" } },
                { model: { contains: query.search, mode: "insensitive" } },
                {
                  stockNumber: {
                    contains: query.search,
                    mode: "insensitive",
                  },
                },
              ],
            },
          },
        },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}
