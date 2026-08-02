import { PageHeader } from "@/components/layout/page-header";
import { ValuationForm } from "./_components/vehicle-valuation-form";
import { Card } from "@/components/ui/card";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";

export const metadata = createPublicMetadata(
  "Fahrzeug verkaufen",
  "Fahrzeug kostenlos bewerten und fair verkaufen.",
  publicRoutes.sellVehicle,
);
export default function SellVehiclePage() {
  return (
    <>
      <PageHeader
        title="Fahrzeug verkaufen"
        description="Kostenlos bewerten. Fair verkaufen. Entspannt wechseln."
        breadcrumb="Fahrzeug verkaufen"
      />
      <div className="site-container grid gap-6 py-10 lg:grid-cols-[1.2fr_.8fr]">
        <Card className="p-7">
          <ValuationForm />
        </Card>
        <Card className="bg-primary p-8 text-white">
          <p className="eyebrow text-[#ff9a75]">Ihr Vorteil</p>
          <h2 className="section-title mt-3">
            Einfach, sicher und ohne Verpflichtung.
          </h2>
          <ul className="mt-7 grid gap-4 text-[#dce5ee]">
            <li>✓ Kostenlose Bewertung</li>
            <li>✓ Keine versteckten Gebühren</li>
            <li>✓ Schnelle Auszahlung</li>
            <li>✓ Abmeldung auf Wunsch inklusive</li>
          </ul>
        </Card>
      </div>
    </>
  );
}
