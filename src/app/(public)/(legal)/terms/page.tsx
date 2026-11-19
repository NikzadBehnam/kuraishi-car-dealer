import { LegalPage } from "../_components/legal-page";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return createPublicMetadata(
    "Allgemeine Geschäftsbedingungen",
    "Allgemeine Geschäftsbedingungen des Autohauses.",
    publicRoutes.terms,
  );
}
export default function Page() {
  return <LegalPage title="Allgemeine Geschäftsbedingungen" />;
}
