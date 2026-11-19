"use server";

import { addAdminInquiryNote } from "@/lib/admin-inquiry-notes";

export async function addAdminInquiryNoteAction(input: unknown) {
  return addAdminInquiryNote(input);
}
