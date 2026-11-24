"use server";

import { saveDealershipSettings } from "@/lib/dealership-settings";

export async function saveDealershipSettingsAction(input: unknown) {
  return saveDealershipSettings(input);
}
