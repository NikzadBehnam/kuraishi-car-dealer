import type { Prisma } from "@/generated/prisma/client";

import type { LeadListQuery } from "./schemas.ts";

export function buildAdminLeadWhere(
  query: LeadListQuery,
): Prisma.LeadWhereInput {
  const conditions: Prisma.LeadWhereInput[] = [];

  if (query.assignedToUserId) {
    conditions.push({ assignedToUserId: query.assignedToUserId });
  }

  if (query.priority) conditions.push({ priority: query.priority });
  if (query.source)
    conditions.push({ source: toPrismaLeadSource(query.source) });
  if (query.status) conditions.push({ status: query.status });

  if (query.search) {
    conditions.push({
      OR: [
        { customerName: { contains: query.search, mode: "insensitive" } },
        { customerEmail: { contains: query.search, mode: "insensitive" } },
        { customerPhone: { contains: query.search, mode: "insensitive" } },
        { message: { contains: query.search, mode: "insensitive" } },
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
        {
          valuationRequest: {
            is: {
              OR: [
                { make: { contains: query.search, mode: "insensitive" } },
                { model: { contains: query.search, mode: "insensitive" } },
              ],
            },
          },
        },
      ],
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

export function buildAdminLeadOrderBy(
  query: LeadListQuery,
): Prisma.LeadOrderByWithRelationInput[] {
  return [
    { [query.sortField]: query.sortDirection },
    { id: query.sortDirection },
  ];
}

function toPrismaLeadSource(source: LeadListQuery["source"]) {
  return source === "test-drive" ? "test_drive" : source;
}
