import { z } from "zod";

import type { Prisma } from "../generated/prisma/client.ts";
import { InquiryService, InquirySource } from "../generated/prisma/enums.ts";
import { adminRoutes } from "../config/admin-routes.config.ts";
import { parseInquiryEmailConfig } from "./inquiry-email-config.ts";
import {
  inventoryIdSchema,
  inventorySlugSchema,
} from "./inventory-validation.ts";
import {
  inquiryAppointmentTypes,
  inquiryServiceMapping,
} from "./inquiry-validation.ts";

export const inquiryNotificationSelect = {
  id: true,
  source: true,
  requestedService: true,
  preferredDate: true,
  vehicleTitleSnapshot: true,
  vehicleSlugSnapshot: true,
} satisfies Prisma.InquirySelect;

type InquiryNotificationRow = Prisma.InquiryGetPayload<{
  select: typeof inquiryNotificationSelect;
}>;

const notificationSchema = z
  .object({
    id: inventoryIdSchema,
    source: z.enum(InquirySource),
    requestedService: z.enum(InquiryService),
    preferredDate: z.date().nullable(),
    vehicleTitleSnapshot: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .refine((value) => !/[\u0000-\u001f\u007f]/.test(value))
      .nullable(),
    vehicleSlugSnapshot: inventorySlugSchema.nullable(),
  })
  .refine(
    (row) =>
      (row.vehicleTitleSnapshot === null) ===
      (row.vehicleSlugSnapshot === null),
  ) satisfies z.ZodType<InquiryNotificationRow>;

const sourceLabels = {
  contact: "Contact",
  test_drive: "Test drive",
  callback: "Callback",
} satisfies Record<InquirySource, string>;

export type StaffInquiryNotification = {
  subject: string;
  text: string;
  html: string;
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function createStaffInquiryNotification(
  input: unknown,
  env: Readonly<Record<string, string | undefined>>,
): StaffInquiryNotification {
  const config = parseInquiryEmailConfig(env);
  if (config.mode === "disabled") {
    throw new Error("Inquiry email notifications are disabled.");
  }
  const parsed = notificationSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Stored inquiry notification data is invalid.");
  }
  const row = parsed.data;
  const appointmentType = inquiryAppointmentTypes.find(
    (type) =>
      inquiryServiceMapping[type].requestedService === row.requestedService,
  );
  if (
    !appointmentType ||
    inquiryServiceMapping[appointmentType].source !== row.source
  ) {
    throw new Error("Stored inquiry service and source do not match.");
  }
  const details: [string, string][] = [
    ["Inquiry reference", row.id],
    ["Source", sourceLabels[row.source]],
    ["Requested service", appointmentType],
  ];
  if (row.vehicleTitleSnapshot !== null && row.vehicleSlugSnapshot !== null) {
    details.push(["Vehicle reference", row.vehicleTitleSnapshot]);
    details.push(["Vehicle slug at submission", row.vehicleSlugSnapshot]);
  }
  if (row.preferredDate !== null) {
    details.push([
      "Requested date",
      row.preferredDate.toISOString().slice(0, 10),
    ]);
  }
  const inboxUrl = new URL(adminRoutes.leads, config.inboxOrigin).href;
  const introduction =
    "A new inquiry was received. Sign in to review its reference in the staff inbox.";
  const bookingNotice = "A requested date is not a confirmed appointment.";
  const privacyNotice =
    "Visitor contact details and the message are available only in the application.";
  return {
    subject: "[TEST] New inquiry",
    text: [
      introduction,
      "",
      ...details.map(([label, value]) => `${label}: ${value}`),
      "",
      bookingNotice,
      privacyNotice,
      "",
      `Open protected inbox: ${inboxUrl}`,
    ].join("\n"),
    html: [
      '<!doctype html><html lang="en"><body>',
      "<h1>New inquiry</h1>",
      `<p>${escapeHtml(introduction)}</p>`,
      "<dl>",
      ...details.map(
        ([label, value]) =>
          `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`,
      ),
      "</dl>",
      `<p>${escapeHtml(bookingNotice)}</p>`,
      `<p>${escapeHtml(privacyNotice)}</p>`,
      `<p><a href="${escapeHtml(inboxUrl)}">Open protected inbox</a></p>`,
      "</body></html>",
    ].join(""),
  };
}
