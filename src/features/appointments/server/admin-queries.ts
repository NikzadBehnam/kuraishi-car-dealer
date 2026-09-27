import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { createPaginatedResult } from "@/features/shared/pagination.ts";
import { authCapabilities, requireCapability } from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

import type { AdminAppointmentBoardQuery } from "../admin-board-search-params.ts";
import type {
  AdminAppointmentBoardResult,
  AdminAppointmentFormOptionsDto,
} from "../dto.ts";
import { toAdminAppointmentDto } from "../mappers.ts";
import {
  buildAdminAppointmentOrderBy,
  buildAdminAppointmentWhere,
} from "../query-policy.ts";
import { appointmentListQuerySchema } from "../schemas.ts";

const appointmentSelect = {
  id: true,
  type: true,
  status: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  startsAt: true,
  endsAt: true,
  location: true,
  notes: true,
  cancellationReason: true,
  confirmedAt: true,
  completedAt: true,
  cancelledAt: true,
  lead: {
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      customerPhone: true,
      vehicleId: true,
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
  assignedTo: {
    select: { id: true, email: true, name: true },
  },
} satisfies Prisma.AppointmentSelect;

export async function getAdminAppointmentBoard(
  input: AdminAppointmentBoardQuery,
): Promise<AdminAppointmentBoardResult> {
  await requireCapability(authCapabilities.manageAppointments);

  const query = appointmentListQuerySchema.parse(input.appointments);
  const where = buildAdminAppointmentWhere(query);
  const skip = (query.page - 1) * query.pageSize;
  const selectedDate = new Date(`${input.selectedDate}T00:00:00.000Z`);
  const agendaFrom = new Date(selectedDate.getTime() - 24 * 60 * 60_000);
  const agendaTo = new Date(selectedDate.getTime() + 48 * 60 * 60_000);

  const [appointments, total, agendaCandidates, options] = await Promise.all([
    prisma.appointment.findMany({
      where,
      orderBy: buildAdminAppointmentOrderBy(query),
      skip,
      take: query.pageSize,
      select: appointmentSelect,
    }),
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where: {
        startsAt: { gte: agendaFrom, lt: agendaTo },
        ...(query.status ? { status: query.status } : {}),
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      select: appointmentSelect,
    }),
    getAppointmentFormOptions(),
  ]);

  return {
    agendaCandidates: agendaCandidates.map(toAdminAppointmentDto),
    appointments: createPaginatedResult(
      appointments.map(toAdminAppointmentDto),
      query.page,
      query.pageSize,
      total,
    ),
    options,
  };
}

async function getAppointmentFormOptions(): Promise<AdminAppointmentFormOptionsDto> {
  const [leads, users, vehicles] = await Promise.all([
    prisma.lead.findMany({
      where: { status: { in: ["new", "contacted", "qualified"] } },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      take: 100,
      select: {
        id: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        vehicleId: true,
      },
    }),
    prisma.user.findMany({
      where: {
        banned: { not: true },
        OR: [
          { role: { contains: "ADMIN", mode: "insensitive" } },
          { role: { contains: "STAFF", mode: "insensitive" } },
        ],
      },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, email: true, name: true },
    }),
    prisma.vehicle.findMany({
      where: { status: { in: ["available", "reserved"] } },
      orderBy: [{ make: "asc" }, { model: "asc" }, { id: "asc" }],
      select: {
        id: true,
        make: true,
        model: true,
        stockNumber: true,
        variant: true,
      },
    }),
  ]);

  return { leads, users, vehicles };
}
