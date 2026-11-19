import { LegalPage } from "../_components/legal-page";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return createPublicMetadata(
    "Cookie-Einstellungen",
    "Informationen und Einstellungen zu Cookies.",
    publicRoutes.cookies,
  );
}
export default function Page() {
  return <LegalPage title="Cookie-Einstellungen" />;
}
