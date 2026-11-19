import "server-only";

import { Prisma, type PrismaClient } from "../generated/prisma/client.ts";
import type { AdminDashboardMetrics } from "../types/admin.ts";
import { prisma } from "./db.ts";
import { serializeAdminDashboardInquiry } from "./admin-dashboard-dto.ts";
import { requireSession } from "./session.ts";

const recentInquirySelect = {
  id: true,
  source: true,
  customerName: true,
  customerEmail: true,
  createdAt: true,
  vehicleTitleSnapshot: true,
  vehicle: {
    select: {
      make: true,
      model: true,
      variant: true,
    },
  },
} satisfies Prisma.InquirySelect;

const vehicleInquiryWhere: Prisma.InquiryWhereInput = {
  OR: [
    { vehicleId: { not: null } },
    { vehicleTitleSnapshot: { not: null } },
    { vehicleSlugSnapshot: { not: null } },
  ],
};

type AdminDashboardClient = Pick<PrismaClient, "$transaction">;
type RecentInquiryRow = Prisma.InquiryGetPayload<{
  select: typeof recentInquirySelect;
}>;

export async function getAdminDashboardMetrics(
  client: AdminDashboardClient = prisma,
): Promise<AdminDashboardMetrics> {
  await requireSession();
  const [
    groupedStatuses,
    soldCount,
    leadCount,
    vehicleInquiryCount,
    recentRows,
  ] = await client.$transaction(
    async (tx) =>
      Promise.all([
        tx.vehicle.groupBy({
          by: ["status"],
          _count: { _all: true },
        }),
        tx.vehicle.count({ where: { soldAt: { not: null } } }),
        tx.inquiry.count(),
        tx.inquiry.count({ where: vehicleInquiryWhere }),
        tx.inquiry.findMany({
          select: recentInquirySelect,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: 5,
        }),
      ]),
    { isolationLevel: "RepeatableRead" },
  );

  const statusCounts: AdminDashboardMetrics["statusCounts"] = {
    draft: 0,
    published: 0,
    reserved: 0,
    sold: 0,
    archived: 0,
  };
  for (const { status, _count } of groupedStatuses) {
    statusCounts[status] = _count._all;
  }

  return {
    inventoryTotal: Object.values(statusCounts).reduce(
      (sum, count) => sum + count,
      0,
    ),
    statusCounts,
    leadCount,
    soldCount,
    vehicleInquiryCount,
    recentInquiries: recentRows.map((row: RecentInquiryRow) =>
      serializeAdminDashboardInquiry(row),
    ),
  };
}
