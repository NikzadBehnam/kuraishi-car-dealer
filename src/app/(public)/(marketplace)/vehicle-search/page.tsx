import Link from "next/link";
import { CarFront, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
        <Card className="rounded p-7">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <div className="field" key={field}>
                <span>{field}</span>
                <Select defaultValue="any">
                  <SelectTrigger aria-label={field}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Beliebig</SelectItem>
                    <SelectItem value="option-1">Auswahl 1</SelectItem>
                    <SelectItem value="option-2">Auswahl 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              type="reset"
              className="rounded-[var(--radius-sm)]"
            >
              <RotateCcw />
              Alles zurücksetzen
            </Button>
            <Button
              asChild
              variant="accent"
              className="rounded-[var(--radius-sm)]"
            >
              <Link href={publicRoutes.vehicles}>
                <CarFront />
                {vehicles.length} Fahrzeuge anzeigen
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
