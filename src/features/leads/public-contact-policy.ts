import type { AppointmentType } from "../appointments/constants.ts";
import type { LeadSource } from "./constants.ts";
import type { PublicContactLeadSubmission } from "./schemas.ts";

const appointmentTypeLabels: Record<AppointmentType, string> = {
  test_drive: "Test drive",
  consultation: "Consultation",
  valuation: "Vehicle valuation",
  workshop: "Workshop",
  callback: "Callback",
};

export function resolvePublicContactLeadSource(
  appointmentType: AppointmentType,
): LeadSource {
  if (appointmentType === "test_drive") return "test-drive";
  if (appointmentType === "valuation") return "valuation";
  if (appointmentType === "callback") return "callback";

  return "contact";
}

export function buildPublicContactLeadMessage(
  input: Pick<PublicContactLeadSubmission, "appointmentType" | "message">,
) {
  const context = `Appointment type: ${appointmentTypeLabels[input.appointmentType]}`;

  return input.message ? `${context}\n\n${input.message}` : context;
}

export function parsePreferredContactDate(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

export function isPreferredContactDateInPast(value: string, now = new Date()) {
  return new Date(`${value}T23:59:59.999Z`).getTime() < now.getTime();
}
