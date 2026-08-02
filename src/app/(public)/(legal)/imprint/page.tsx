import { LegalPage } from "../_components/legal-page";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";
export const metadata = createPublicMetadata(
  "Impressum",
  "Rechtliche Anbieterangaben.",
  publicRoutes.imprint,
);
export default function Page() {
  return <LegalPage title="Impressum" />;
}
