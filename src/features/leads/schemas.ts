import { z } from "zod";

import {
  appointmentTypes,
  type AppointmentType,
} from "../appointments/constants.ts";
import {
  normalizedEmailSchema,
  normalizedNameSchema,
  optionalMessageSchema,
  optionalPhoneSchema,
  optionalSearchSchema,
  paginationQueryShape,
  resourceIdSchema,
  sortDirectionSchema,
} from "../shared/schemas.ts";
import {
  leadPriorities,
  leadSortFields,
  leadSources,
  leadStatuses,
} from "./constants.ts";

export const leadSourceSchema = z.enum(leadSources);
export const leadStatusSchema = z.enum(leadStatuses);
export const leadPrioritySchema = z.enum(leadPriorities);
export const leadSortFieldSchema = z.enum(leadSortFields);

export const leadContactSchema = z.object({
  customerEmail: normalizedEmailSchema,
  customerName: normalizedNameSchema,
  customerPhone: optionalPhoneSchema,
  message: optionalMessageSchema,
});

export const publicContactLeadSubmissionSchema = z.object({
  appointmentType: z.enum(appointmentTypes),
  consent: z.boolean().refine(Boolean, "Consent is required."),
  email: normalizedEmailSchema,
  message: optionalMessageSchema,
  name: normalizedNameSchema,
  phone: optionalPhoneSchema,
  preferredDate: z.iso.date(),
  website: z.string().max(0).optional(),
});

export const leadListQuerySchema = z.object({
  ...paginationQueryShape,
  assignedToUserId: resourceIdSchema.optional(),
  priority: leadPrioritySchema.optional(),
  search: optionalSearchSchema,
  sortDirection: sortDirectionSchema.default("desc"),
  sortField: leadSortFieldSchema.default("createdAt"),
  source: leadSourceSchema.optional(),
  status: leadStatusSchema.optional(),
});

export type LeadContact = z.infer<typeof leadContactSchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
export type PublicContactLeadSubmission = z.infer<
  typeof publicContactLeadSubmissionSchema
> & { appointmentType: AppointmentType };
