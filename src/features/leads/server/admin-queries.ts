import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { createPaginatedResult } from "@/features/shared/pagination.ts";
import { authCapabilities, requireCapability } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

import type { AdminLeadActivityDto, AdminLeadListResult } from "../dto.ts";
import {
  buildAdminLeadStatusCounts,
  toAdminLeadActivityDto,
  toAdminLeadDto,
} from "../mappers.ts";
import { buildAdminLeadOrderBy, buildAdminLeadWhere } from "../query-policy.ts";
import { leadListQuerySchema } from "../schemas.ts";

const adminLeadSelect = {
  id: true,
  source: true,
  status: true,
  priority: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  message: true,
  preferredDate: true,
  createdAt: true,
  updatedAt: true,
  assignedTo: {
    select: {
      id: true,
      email: true,
      name: true,
    },
  },
  vehicle: {
    select: {
      id: true,
      make: true,
      mileage: true,
      model: true,
      stockNumber: true,
      variant: true,
    },
  },
  valuationRequest: {
    select: {
      accidentHistory: true,
      conditionDescription: true,
      firstRegistration: true,
      make: true,
      mileage: true,
      model: true,
      serviceHistory: true,
    },
  },
  _count: {
    select: { notes: true },
  },
} satisfies Prisma.LeadSelect;

const leadActivitySelect = {
  id: true,
  occurredAt: true,
  summary: true,
  targetId: true,
  targetLabel: true,
} satisfies Prisma.ActivityEventSelect;

export async function listAdminLeads(
  input: unknown = {},
): Promise<AdminLeadListResult> {
  await requireCapability(authCapabilities.manageLeads);

  const query = leadListQuerySchema.parse(input);
  const where = buildAdminLeadWhere(query);
  const statusCountWhere = buildAdminLeadWhere({
    ...query,
    status: undefined,
  });
  const skip = (query.page - 1) * query.pageSize;

  const [leads, total, statusRows] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      orderBy: buildAdminLeadOrderBy(query),
      skip,
      take: query.pageSize,
      select: adminLeadSelect,
    }),
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ["status"],
      where: statusCountWhere,
      _count: { _all: true },
    }),
  ]);

  const activityEvents =
    leads.length > 0
      ? await prisma.activityEvent.findMany({
          where: {
            targetType: "lead",
            targetId: { in: leads.map((lead) => lead.id) },
          },
          orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
          select: leadActivitySelect,
        })
      : [];
  const activityByLeadId = groupActivityByLeadId(activityEvents);
  const paginated = createPaginatedResult(
    leads.map((lead) =>
      toAdminLeadDto(lead, activityByLeadId.get(lead.id) ?? []),
    ),
    query.page,
    query.pageSize,
    total,
  );

  return {
    ...paginated,
    statusCounts: buildAdminLeadStatusCounts(statusRows),
  };
}

function groupActivityByLeadId(
  events: Array<{
    id: string;
    occurredAt: Date;
    summary: string;
    targetId: string;
    targetLabel: string;
  }>,
) {
  const grouped = new Map<string, AdminLeadActivityDto[]>();

  for (const event of events) {
    const current = grouped.get(event.targetId) ?? [];
    current.push(toAdminLeadActivityDto(event));
    grouped.set(event.targetId, current);
  }

  return grouped;
}
