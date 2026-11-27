import { z } from "zod";

import type {
  InquiryNotificationStatus,
  InquiryService,
  InquirySource,
} from "../generated/prisma/enums.ts";
import type {
  AdminInquiryDetail,
  AdminInquiryListItem,
  AdminInquiryNote,
  AdminInquiryVehicle,
  AdminLeadSource,
} from "../types/admin.ts";
import type { InquiryNotificationErrorCode } from "./inquiry-notification-retry.ts";
import {
  inquiryServiceTopics,
  inquiryServiceTopicSchema,
} from "./inquiry-service-topics.ts";

const notificationErrorCodeSchema = z.enum([
  "provider_rejected",
  "provider_unavailable",
  "provider_response_invalid",
  "configuration_invalid",
  "invalid_notification",
  "attempts_exhausted",
]);

const sourceLabels = {
  contact: "contact",
  test_drive: "test-drive",
  callback: "callback",
} satisfies Record<InquirySource, AdminLeadSource>;

const serviceLabels = {
  test_drive: "Test drive",
  consultation: "Consultation",
  vehicle_valuation: "Vehicle valuation",
  workshop: "Workshop",
  callback: "Callback",
} satisfies Record<InquiryService, string>;

interface AdminInquiryNotificationListRow {
  status: InquiryNotificationStatus;
}

interface AdminInquiryNotificationDetailRow extends AdminInquiryNotificationListRow {
  status: InquiryNotificationStatus;
  attemptCount: number;
  lastErrorCode: string | null;
  nextAttemptAt: Date;
  sentAt: Date | null;
}

export interface AdminInquiryQueryRow {
  id: string;
  source: InquirySource;
  requestedService: InquiryService;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  vehicleId: string | null;
  vehicleTitleSnapshot: string | null;
  vehicleSlugSnapshot: string | null;
  createdAt: Date;
  vehicle: AdminInquiryVehicle | null;
  notification: AdminInquiryNotificationListRow | null;
  _count: { notes: number };
}

export interface AdminInquiryNoteQueryRow {
  id: string;
  content: string;
  createdAt: Date;
  author: { name: string };
}

export interface AdminInquiryDetailQueryRow extends Omit<
  AdminInquiryQueryRow,
  "notification"
> {
  serviceTopic: string | null;
  message: string;
  preferredDate: Date | null;
  updatedAt: Date;
  notes: AdminInquiryNoteQueryRow[];
  notification: AdminInquiryNotificationDetailRow | null;
}

function serializeVehicle(
  vehicle: AdminInquiryVehicle | null,
): AdminInquiryVehicle | null {
  return vehicle
    ? {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        variant: vehicle.variant,
        stockNumber: vehicle.stockNumber,
        mileage: vehicle.mileage,
        location: vehicle.location,
      }
    : null;
}

export function serializeAdminInquirySource(
  source: InquirySource,
): AdminLeadSource {
  return sourceLabels[source];
}

function serializeErrorCode(
  value: string | null,
): InquiryNotificationErrorCode | null {
  if (value === null) return null;
  const parsed = notificationErrorCodeSchema.safeParse(value);
  if (!parsed.success) {
    throw new Error("Stored inquiry notification error code is invalid.");
  }
  return parsed.data;
}

export function serializeAdminInquiryListItem(
  row: AdminInquiryQueryRow,
): AdminInquiryListItem {
  return {
    id: row.id,
    source: serializeAdminInquirySource(row.source),
    requestedService: serviceLabels[row.requestedService],
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    vehicleId: row.vehicleId,
    vehicleTitleSnapshot: row.vehicleTitleSnapshot,
    vehicleSlugSnapshot: row.vehicleSlugSnapshot,
    vehicle: serializeVehicle(row.vehicle),
    createdAt: row.createdAt.toISOString(),
    deliveryStatus: row.notification?.status ?? "untracked",
    notesCount: row._count.notes,
  };
}

function serializeAdminInquiryNote(
  row: AdminInquiryNoteQueryRow,
): AdminInquiryNote {
  return {
    id: row.id,
    authorName: row.author.name,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeAdminInquiryDetail(
  row: AdminInquiryDetailQueryRow,
): AdminInquiryDetail {
  const summary = serializeAdminInquiryListItem(row);
  return {
    ...summary,
    serviceTopic:
      row.serviceTopic === null
        ? null
        : inquiryServiceTopics[
            inquiryServiceTopicSchema.parse(row.serviceTopic)
          ].title,
    message: row.message,
    preferredDate: row.preferredDate?.toISOString().slice(0, 10) ?? null,
    updatedAt: row.updatedAt.toISOString(),
    notes: row.notes.map(serializeAdminInquiryNote),
    delivery: row.notification
      ? {
          status: row.notification.status,
          attemptCount: row.notification.attemptCount,
          lastErrorCode: serializeErrorCode(row.notification.lastErrorCode),
          nextAttemptAt: row.notification.nextAttemptAt.toISOString(),
          sentAt: row.notification.sentAt?.toISOString() ?? null,
        }
      : null,
  };
}
