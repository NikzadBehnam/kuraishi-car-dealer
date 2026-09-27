"use server";

import { revalidatePath } from "next/cache";

import { adminRoutes } from "@/config/admin-routes.config";
import { deleteMediaAssets } from "@/features/media/server/commands";

export async function deleteMediaAssetsAction(input: unknown) {
  const result = await deleteMediaAssets(input);

  if (result.ok) revalidatePath(adminRoutes.media);

  return result;
}
