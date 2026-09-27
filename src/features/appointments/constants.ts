export const appointmentTypes = [
  "test_drive",
  "consultation",
  "valuation",
  "workshop",
  "callback",
] as const;

export const appointmentStatuses = [
  "requested",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export const appointmentSortFields = [
  "startsAt",
  "createdAt",
  "status",
] as const;

export type AppointmentType = (typeof appointmentTypes)[number];
export type AppointmentStatus = (typeof appointmentStatuses)[number];
export type AppointmentSortField = (typeof appointmentSortFields)[number];
