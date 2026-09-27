"use server";

import { revalidatePath } from "next/cache";

import { adminRoutes } from "@/config/admin-routes.config";
import { submitPublicVehicleValuation } from "@/features/leads/server/public-commands";

export async function submitPublicVehicleValuationAction(input: unknown) {
  const result = await submitPublicVehicleValuation(input);

  if (result.ok) revalidatePath(adminRoutes.leads);

  return result;
}
