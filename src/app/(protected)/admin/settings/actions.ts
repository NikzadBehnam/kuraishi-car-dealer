"use server";

import { updateDealershipSettings } from "@/lib/dealership-settings";

export async function saveDealershipSettingsAction(input: unknown) {
  return updateDealershipSettings(input);
}
