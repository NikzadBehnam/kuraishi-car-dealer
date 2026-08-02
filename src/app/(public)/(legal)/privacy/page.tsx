import { LegalPage } from "../_components/legal-page";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";
export const metadata = createPublicMetadata(
  "Datenschutz",
  "Informationen zum Datenschutz.",
  publicRoutes.privacy,
);
export default function Page() {
  return <LegalPage title="Datenschutz" />;
}
