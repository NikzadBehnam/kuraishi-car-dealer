import "server-only";

import { Prisma, type PrismaClient } from "../generated/prisma/client.ts";
import type { AdminInquiryDetail, AdminInquiryPage } from "../types/admin.ts";
import { prisma } from "./db.ts";
import {
  serializeAdminInquiryDetail,
  serializeAdminInquiryListItem,
} from "./admin-inquiry-dto.ts";
import { getAdminInquiryWhere } from "./admin-inquiry-query.ts";
import {
  ADMIN_INQUIRY_PAGE_SIZE,
  adminInquirySearchParamsSchema,
} from "./admin-inquiry-validation.ts";
import { requireSession } from "./session.ts";

const vehicleInterestSelect = {
  id: true,
  make: true,
  model: true,
  variant: true,
  stockNumber: true,
  mileage: true,
  location: true,
} satisfies Prisma.VehicleSelect;

const notificationListSelect = {
  status: true,
} satisfies Prisma.InquiryNotificationSelect;

const notificationDetailSelect = {
  status: true,
  attemptCount: true,
  lastErrorCode: true,
  nextAttemptAt: true,
  sentAt: true,
} satisfies Prisma.InquiryNotificationSelect;

const inquiryListSelect = {
  id: true,
  source: true,
  requestedService: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  vehicleId: true,
  vehicleTitleSnapshot: true,
  vehicleSlugSnapshot: true,
  createdAt: true,
  vehicle: { select: vehicleInterestSelect },
  notification: { select: notificationListSelect },
  _count: { select: { notes: true } },
} satisfies Prisma.InquirySelect;

const inquiryDetailSelect = {
  ...inquiryListSelect,
  message: true,
  preferredDate: true,
  updatedAt: true,
  notification: { select: notificationDetailSelect },
  notes: {
    select: {
      id: true,
      content: true,
      createdAt: true,
      author: { select: { name: true } },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  },
} satisfies Prisma.InquirySelect;

type AdminInquiryClient = Pick<PrismaClient, "$transaction">;

export interface AdminInquiryPageData extends AdminInquiryPage {
  selectedInquiry: AdminInquiryDetail | null;
  requestedLeadId: string | null;
}

export async function getAdminInquiryPage(
  input: unknown,
  client: AdminInquiryClient = prisma,
): Promise<AdminInquiryPageData> {
  const params = adminInquirySearchParamsSchema.parse(input);
  await requireSession();

  const { q, page, lead } = params;
  const where: Prisma.InquiryWhereInput = getAdminInquiryWhere(q);
  const skip = (page - 1) * ADMIN_INQUIRY_PAGE_SIZE;

  const [rows, total, selectedRow] = await client.$transaction(
    async (tx) => {
      const [inquiries, count, selected] = await Promise.all([
        tx.inquiry.findMany({
          where,
          select: inquiryListSelect,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          skip,
          take: ADMIN_INQUIRY_PAGE_SIZE,
        }),
        tx.inquiry.count({ where }),
        lead
          ? tx.inquiry.findUnique({
              where: { id: lead },
              select: inquiryDetailSelect,
            })
          : Promise.resolve(null),
      ]);
      return [inquiries, count, selected] as const;
    },
    { isolationLevel: "RepeatableRead" },
  );

  return {
    items: rows.map(serializeAdminInquiryListItem),
    total,
    page,
    pageSize: ADMIN_INQUIRY_PAGE_SIZE,
    totalPages: Math.ceil(total / ADMIN_INQUIRY_PAGE_SIZE),
    search: q,
    selectedInquiry: selectedRow
      ? serializeAdminInquiryDetail(selectedRow)
      : null,
    requestedLeadId: lead ?? null,
  };
}
