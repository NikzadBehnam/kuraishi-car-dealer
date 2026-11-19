import { getAdminDealershipSettings } from "@/lib/dealership-settings";

import { SettingsPanel } from "./_components/settings-panel";

export default async function AdminSettingsPage() {
  const settings = await getAdminDealershipSettings();
  return <SettingsPanel settings={settings} />;
}
