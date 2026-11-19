import { LegalPage } from "../_components/legal-page";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return createPublicMetadata(
    "Datenschutz",
    "Informationen zum Datenschutz.",
    publicRoutes.privacy,
  );
}
export default function Page() {
  return <LegalPage title="Datenschutz" />;
}
