import { LegalPage } from "../_components/legal-page";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";
export const metadata = createPublicMetadata(
  "Allgemeine Geschäftsbedingungen",
  "Allgemeine Geschäftsbedingungen von Kuraishi Autohandel e.U.",
  publicRoutes.terms,
);
export default function Page() {
  return <LegalPage title="Allgemeine Geschäftsbedingungen" />;
}
