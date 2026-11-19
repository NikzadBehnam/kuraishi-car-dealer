import { z } from "zod";

import { adminRoutes } from "../config/admin-routes.config.ts";
import { inventoryIdSchema } from "./inventory-validation.ts";

export const ADMIN_INQUIRY_PAGE_SIZE = 25;
export const MAX_ADMIN_INQUIRY_SEARCH_LENGTH = 100;
export const MAX_ADMIN_INQUIRY_NOTE_LENGTH = 2000;

const maximumOffset = 2_147_483_647;

export const addAdminInquiryNoteSchema = z.strictObject({
  inquiryId: z
    .string()
    .min(1, "Inquiry ID is required.")
    .max(128, "Inquiry ID is too long.")
    .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/, "Invalid inquiry ID."),
  content: z
    .string()
    .trim()
    .min(1, "Enter a note before saving.")
    .max(
      MAX_ADMIN_INQUIRY_NOTE_LENGTH,
      `Notes must be ${MAX_ADMIN_INQUIRY_NOTE_LENGTH} characters or fewer.`,
    )
    .refine(
      (value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value),
      "The note contains unsupported control characters.",
    ),
});

export const adminInquirySearchParamsSchema = z.strictObject({
  q: z
    .string()
    .trim()
    .max(MAX_ADMIN_INQUIRY_SEARCH_LENGTH)
    .refine((value) => !/[\u0000-\u001f\u007f]/.test(value))
    .default(""),
  page: z
    .string()
    .regex(/^[1-9]\d*$/)
    .default("1")
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .positive()
        .refine(Number.isSafeInteger)
        .refine(
          (page) =>
            Number.isSafeInteger((page - 1) * ADMIN_INQUIRY_PAGE_SIZE) &&
            (page - 1) * ADMIN_INQUIRY_PAGE_SIZE <= maximumOffset,
        ),
    ),
  lead: inventoryIdSchema.optional(),
});

export type AdminInquirySearchParams = z.infer<
  typeof adminInquirySearchParamsSchema
>;

export function getAdminInquirySearchTerms(search: string): string[] {
  return search.toLocaleLowerCase("de").split(/\s+/).filter(Boolean);
}

export function buildAdminInquiriesHref(search: string, page: number): string {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `${adminRoutes.leads}?${query}` : adminRoutes.leads;
}

export function buildAdminInquiryDetailHref(inquiryId: string): string {
  const params = new URLSearchParams({ lead: inquiryId });
  return `${adminRoutes.leads}?${params.toString()}`;
}
