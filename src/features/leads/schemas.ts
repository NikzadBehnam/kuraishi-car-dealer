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
  normalizedTextSchema,
  paginationQueryShape,
  resourceIdSchema,
  sortDirectionSchema,
} from "../shared/schemas.ts";
import {
  leadPriorities,
  leadSortFields,
  leadSources,
  leadStatuses,
  valuationAccidentHistories,
  valuationConditions,
  valuationServiceHistories,
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

export const publicVehicleValuationSubmissionSchema = z.object({
  accidentHistory: z.enum(valuationAccidentHistories),
  condition: z.enum(valuationConditions),
  consent: z.boolean().refine(Boolean, "Consent is required."),
  email: normalizedEmailSchema,
  firstRegistration: z
    .string()
    .regex(
      /^(19[5-9]\d|20\d{2})-(0[1-9]|1[0-2])$/,
      "Use a valid registration month.",
    ),
  make: normalizedTextSchema(80),
  mileage: z.coerce.number().int().min(0).max(2_000_000),
  model: normalizedTextSchema(80),
  name: normalizedNameSchema,
  phone: optionalPhoneSchema,
  serviceHistory: z.enum(valuationServiceHistories),
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
export type PublicVehicleValuationSubmission = z.infer<
  typeof publicVehicleValuationSubmissionSchema
>;
