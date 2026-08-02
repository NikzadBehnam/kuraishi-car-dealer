import { LegalPage } from "../_components/legal-page";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";
export const metadata = createPublicMetadata(
  "Allgemeine Geschäftsbedingungen",
  "Allgemeine Geschäftsbedingungen von Autowelt Rhein.",
  publicRoutes.terms,
);
export default function Page() {
  return <LegalPage title="Allgemeine Geschäftsbedingungen" />;
}
