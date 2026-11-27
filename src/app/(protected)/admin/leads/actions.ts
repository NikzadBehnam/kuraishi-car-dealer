"use server";

import { revalidatePath } from "next/cache";
import { adminRoutes } from "@/config/admin-routes.config";
import { addAdminInquiryNote } from "@/lib/admin-inquiry-notes";
import { getAdminInquiryPage } from "@/lib/admin-inquiry-queries";
import { updateAdminInquiryStatus } from "@/lib/admin-inquiry-status";
import { adminInquirySearchParamsSchema } from "@/lib/admin-inquiry-validation";
import { AuthorizationError } from "@/lib/session";

export async function addAdminInquiryNoteAction(input: unknown) {
  return addAdminInquiryNote(input);
}

export async function updateAdminInquiryStatusAction(input: unknown) {
  try {
    const result = await updateAdminInquiryStatus(input);
    if (result.ok) revalidatePath(adminRoutes.leads);
    return result;
  } catch {
    console.error("Lead status update failed.", {
      event: "lead_status_failed",
    });
    return {
      ok: false,
      message: "The status could not be confirmed. Refresh before retrying.",
    } as const;
  }
}

export async function searchAdminInquiriesAction(
  q: unknown,
  page: unknown,
  status: unknown,
) {
  if (!adminInquirySearchParamsSchema.safeParse({ q, page, status }).success) {
    return {
      ok: false,
      message: "Check the search and status filter and try again.",
    } as const;
  }
  try {
    const result = await getAdminInquiryPage({ q, page, status });
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
