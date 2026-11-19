import { z } from "zod";

import { adminRoutes } from "../config/admin-routes.config.ts";
import { inventoryIdSchema } from "./inventory-validation.ts";

export const ADMIN_INQUIRY_PAGE_SIZE = 25;
export const MAX_ADMIN_INQUIRY_SEARCH_LENGTH = 100;

const maximumOffset = 2_147_483_647;

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
