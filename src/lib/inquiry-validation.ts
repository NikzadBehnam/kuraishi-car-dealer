import { z } from "zod";

import type {
  InquiryService,
  InquirySource,
} from "../generated/prisma/enums.ts";
import { dealershipDate } from "./business-date.ts";

export const inquiryAppointmentTypes = [
  "Probefahrt",
  "Beratung",
  "Fahrzeugbewertung",
  "Werkstatt",
  "Rückruf",
] as const;

export const inquiryServiceMapping = {
  Probefahrt: { requestedService: "test_drive", source: "test_drive" },
  Beratung: { requestedService: "consultation", source: "contact" },
  Fahrzeugbewertung: {
    requestedService: "vehicle_valuation",
    source: "contact",
  },
  Werkstatt: { requestedService: "workshop", source: "contact" },
  Rückruf: { requestedService: "callback", source: "callback" },
} as const satisfies Record<
  (typeof inquiryAppointmentTypes)[number],
  { requestedService: InquiryService; source: InquirySource }
>;

const singleLine = (minimum: number, maximum: number, message: string) =>
  z
    .string()
    .trim()
    .min(minimum, message)
    .max(maximum, message)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), message);

export function isValidInquiryDate(value: string, now = new Date()): boolean {
  if (!/^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value &&
    value >= dealershipDate(now)
  );
}

export const inquiryFieldsSchema = z.strictObject({
  name: singleLine(
    2,
    200,
    "Bitte geben Sie einen Namen mit 2 bis 200 Zeichen ein.",
  ),
  email: z
    .string()
    .trim()
    .max(254)
    .email("Bitte geben Sie eine gültige E-Mail-Adresse ein."),
  phone: z
    .string()
    .trim()
    .max(32, "Die Telefonnummer ist zu lang.")
    .refine(
      (value) =>
        value === "" ||
        (/^\+?[0-9][0-9 ()-]*$/.test(value) &&
          value.replace(/\D/g, "").length >= 7 &&
          value.replace(/\D/g, "").length <= 15),
      "Bitte geben Sie eine gültige Telefonnummer ein.",
    )
    .optional(),
  appointmentType: z.enum(inquiryAppointmentTypes, {
    error: "Bitte wählen Sie eine gültige Anfrageart.",
  }),
  preferredDate: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || isValidInquiryDate(value),
      "Bitte wählen Sie ein gültiges Datum ab heute (Europe/Vienna).",
    )
    .optional(),
  message: z
    .string()
    .trim()
    .max(1000, "Die Nachricht darf höchstens 1.000 Zeichen enthalten.")
    .refine(
      (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value),
      "Die Nachricht enthält ungültige Steuerzeichen.",
    ),
  consent: z
    .boolean()
    .refine(Boolean, "Bitte stimmen Sie der Datenverarbeitung zu."),
});

export type InquiryFields = z.infer<typeof inquiryFieldsSchema>;
