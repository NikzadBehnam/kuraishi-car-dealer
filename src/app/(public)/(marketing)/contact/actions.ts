"use server";

import { revalidatePath } from "next/cache";

import { adminRoutes } from "@/config/admin-routes.config";
import { submitPublicContactLead } from "@/features/leads/server/public-commands";

export async function submitPublicContactLeadAction(input: unknown) {
  const result = await submitPublicContactLead(input);

  if (result.ok) revalidatePath(adminRoutes.leads);

  return result;
}
