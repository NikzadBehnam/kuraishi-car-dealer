import { PageHeader } from "@/components/layout/page-header";
import { FinancingCalculator } from "./_components/financing-calculator";
import { Card } from "@/components/ui/card";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";

export const metadata = createPublicMetadata(
  "Finanzierung",
  "Flexible Fahrzeugfinanzierung mit persönlicher Beratung.",
  publicRoutes.financing,
);
export default function FinancingPage() {
  return (
    <>
      <PageHeader
        title="Finanzierung"
        description="Flexibel planen. Sicher entscheiden."
        breadcrumb="Finanzierung"
      />
      <div className="site-container grid gap-8 py-10 lg:grid-cols-2">
        <Card className="p-7">
          <h2 className="section-title text-3xl">Rate berechnen</h2>
          <div className="mt-7">
            <FinancingCalculator />
          </div>
        </Card>
        <div>
          <p className="eyebrow">Finanzierung nach Maß</p>
          <h2 className="section-title mt-3">So individuell wie Ihr Alltag.</h2>
          <p className="text-muted-foreground mt-5">
            Gemeinsam finden wir eine Finanzierung mit flexibler Anzahlung,
            Laufzeit und Schlussrate.
          </p>
          <div className="mt-7 grid gap-3">
            {[
              "Flexible Laufzeiten",
              "Sondertilgung möglich",
              "Schnelle Entscheidung",
              "Persönliche Beratung",
            ].map((item) => (
              <Card className="p-4 font-bold" key={item}>
                ✓ {item}
              </Card>
            ))}
          </div>
          <p className="mt-6 rounded-md bg-[#fff4ee] p-4 text-sm text-[#873414] dark:bg-orange-950/50 dark:text-orange-200">
            Alle Berechnungen sind unverbindliche Beispiele und stellen kein
            Kreditangebot dar.
          </p>
        </div>
      </div>
    </>
  );
}
