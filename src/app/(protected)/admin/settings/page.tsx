import { siteConfig } from "@/config/site.config";
import { SettingsPanel } from "./_components/settings-panel";

export default function AdminSettingsPage() {
  return <SettingsPanel site={siteConfig} />;
}
