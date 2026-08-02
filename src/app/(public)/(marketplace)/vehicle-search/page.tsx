import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { vehicles } from "@/data/vehicles";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";

export const metadata = createPublicMetadata(
  "Erweiterte Fahrzeugsuche",
  "Fahrzeuge nach Marke, Preis, Antrieb und Ausstattung suchen.",
  publicRoutes.vehicleSearch,
);
export default function AdvancedSearchPage() {
  const fields = [
    "Marke",
    "Modell",
    "Variante",
    "Fahrzeugtyp",
    "Preis von",
    "Preis bis",
    "Erstzulassung ab",
    "Kilometerstand bis",
    "Kraftstoff",
    "Getriebe",
    "Leistung ab",
    "Antrieb",
    "Außenfarbe",
    "Standort",
    "Umkreis",
  ];
  return (
    <>
      <PageHeader
        title="Erweiterte Fahrzeugsuche"
        description="Alle Kriterien im Blick – schneller zum passenden Fahrzeug."
        breadcrumb="Fahrzeugsuche"
      />
      <div className="site-container py-10">
        <Card className="p-7">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <label className="field" key={field}>
                {field}
                <select className="control">
                  <option>Beliebig</option>
                  <option>Auswahl 1</option>
                  <option>Auswahl 2</option>
                </select>
              </label>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" type="reset">
              Alles zurücksetzen
            </Button>
            <Button asChild variant="accent">
              <Link href={publicRoutes.vehicles}>
                {vehicles.length} Fahrzeuge anzeigen
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
