import type { Prisma } from "@/generated/prisma/client";

import type { AppointmentListQuery } from "./schemas.ts";

export function buildAdminAppointmentWhere(
  query: AppointmentListQuery,
): Prisma.AppointmentWhereInput {
  const conditions: Prisma.AppointmentWhereInput[] = [];

  if (query.assignedToUserId) {
    conditions.push({ assignedToUserId: query.assignedToUserId });
  }
  if (query.from) conditions.push({ startsAt: { gte: new Date(query.from) } });
  if (query.status) conditions.push({ status: query.status });
  if (query.to) conditions.push({ startsAt: { lte: new Date(query.to) } });
  if (query.type) conditions.push({ type: query.type });
  if (query.vehicleId) conditions.push({ vehicleId: query.vehicleId });

  if (query.search) {
    conditions.push({
      OR: [
        { customerName: { contains: query.search, mode: "insensitive" } },
        { customerEmail: { contains: query.search, mode: "insensitive" } },
        { customerPhone: { contains: query.search, mode: "insensitive" } },
        { location: { contains: query.search, mode: "insensitive" } },
        { notes: { contains: query.search, mode: "insensitive" } },
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

export function buildAdminAppointmentOrderBy(
  query: AppointmentListQuery,
): Prisma.AppointmentOrderByWithRelationInput[] {
  return [
    { [query.sortField]: query.sortDirection },
    { id: query.sortDirection },
  ];
}
