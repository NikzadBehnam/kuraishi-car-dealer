import { z } from "zod";

import {
  normalizedEmailSchema,
  normalizedNameSchema,
  normalizedTextSchema,
  optionalMessageSchema,
  optionalPhoneSchema,
  optionalSearchSchema,
  paginationQueryShape,
  resourceIdSchema,
  sortDirectionSchema,
  userIdSchema,
} from "../shared/schemas.ts";
import {
  appointmentSortFields,
  appointmentStatuses,
  appointmentTypes,
} from "./constants.ts";

export const appointmentTypeSchema = z.enum(appointmentTypes);
export const appointmentStatusSchema = z.enum(appointmentStatuses);
export const appointmentSortFieldSchema = z.enum(appointmentSortFields);

export const appointmentWindowSchema = z
  .object({
    endsAt: z.iso.datetime({ offset: true }),
    startsAt: z.iso.datetime({ offset: true }),
  })
  .refine(({ endsAt, startsAt }) => Date.parse(endsAt) > Date.parse(startsAt), {
    message: "Appointment end must be after its start.",
    path: ["endsAt"],
  });

export const appointmentDraftSchema = z
  .object({
    assignedToUserId: userIdSchema.optional(),
    customerEmail: normalizedEmailSchema,
    customerName: normalizedNameSchema,
    customerPhone: optionalPhoneSchema,
    endsAt: z.iso.datetime({ offset: true }),
    leadId: resourceIdSchema.optional(),
    location: normalizedTextSchema(160),
    notes: optionalMessageSchema,
    startsAt: z.iso.datetime({ offset: true }),
    type: appointmentTypeSchema,
    vehicleId: resourceIdSchema.optional(),
  })
  .refine(({ endsAt, startsAt }) => Date.parse(endsAt) > Date.parse(startsAt), {
    message: "Appointment end must be after its start.",
    path: ["endsAt"],
  });

export const appointmentListQuerySchema = z
  .object({
    ...paginationQueryShape,
    assignedToUserId: userIdSchema.optional(),
    from: z.iso.datetime({ offset: true }).optional(),
    search: optionalSearchSchema,
    sortDirection: sortDirectionSchema.default("asc"),
    sortField: appointmentSortFieldSchema.default("startsAt"),
    status: appointmentStatusSchema.optional(),
    to: z.iso.datetime({ offset: true }).optional(),
    type: appointmentTypeSchema.optional(),
    vehicleId: resourceIdSchema.optional(),
  })
  .refine(
    ({ from, to }) => !from || !to || Date.parse(to) >= Date.parse(from),
    {
      message: "Date range end must not be before its start.",
      path: ["to"],
    },
  );

export const appointmentStatusCommandSchema = z.object({
  cancellationReason: optionalMessageSchema,
  id: resourceIdSchema,
  status: appointmentStatusSchema,
});

export const appointmentRescheduleCommandSchema = z
  .object({
    endsAt: z.iso.datetime({ offset: true }),
    id: resourceIdSchema,
    startsAt: z.iso.datetime({ offset: true }),
  })
  .refine(({ endsAt, startsAt }) => Date.parse(endsAt) > Date.parse(startsAt), {
    message: "Appointment end must be after its start.",
    path: ["endsAt"],
  });

export type AppointmentDraft = z.infer<typeof appointmentDraftSchema>;
export type AppointmentListQuery = z.infer<typeof appointmentListQuerySchema>;
export type AppointmentRescheduleCommand = z.infer<
  typeof appointmentRescheduleCommandSchema
>;
