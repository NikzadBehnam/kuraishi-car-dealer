"use server";

import { addAdminInquiryNote } from "@/lib/admin-inquiry-notes";
import { getAdminInquiryPage } from "@/lib/admin-inquiry-queries";
import { adminInquirySearchParamsSchema } from "@/lib/admin-inquiry-validation";
import { AuthorizationError } from "@/lib/session";

export async function addAdminInquiryNoteAction(input: unknown) {
  return addAdminInquiryNote(input);
}

export async function searchAdminInquiriesAction(q: unknown, page: unknown) {
  if (!adminInquirySearchParamsSchema.safeParse({ q, page }).success) {
    return {
      ok: false,
      message: "Enter a valid search term and try again.",
    } as const;
  }
  try {
    const result = await getAdminInquiryPage({ q, page });
    return {
      ok: true,
      leads: result.items,
      total: result.total,
      page: result.page,
      totalPages: Math.max(1, result.totalPages),
    } as const;
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return {
        ok: false,
        message: "Your session is no longer valid. Sign in again.",
      } as const;
    }
    console.error("Leads search failed.", { event: "leads_search_failed" });
    return {
      ok: false,
      message: "The search could not be completed. Please try again.",
    } as const;
  }
}
