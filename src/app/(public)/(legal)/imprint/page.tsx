import { LegalPage } from "../_components/legal-page";
import { publicRoutes } from "@/config/routes.config";
import { getPublicDealershipSettings } from "@/lib/dealership-settings";
import { createPublicMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return createPublicMetadata(
    "Impressum",
    "Rechtliche Anbieterangaben.",
    publicRoutes.imprint,
  );
}
export default async function Page() {
  const dealership = await getPublicDealershipSettings();
  return <LegalPage title="Impressum" dealership={dealership} />;
}
