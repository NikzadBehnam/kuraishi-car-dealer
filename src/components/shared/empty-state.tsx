import Link from "next/link";
import { CarFront, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes.config";
export function EmptyState({
  title = "Keine Fahrzeuge gefunden",
  description = "Ändern Sie Ihre Suche oder entdecken Sie unser gesamtes Angebot.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="grid justify-items-center py-20 text-center">
      <SearchX className="text-muted-foreground size-12" />
      <h2 className="section-title mt-5 text-3xl">{title}</h2>
      <p className="text-muted-foreground mt-3">{description}</p>
      <Button
        asChild
        variant="accent"
        className="mt-6 rounded-[var(--radius-sm)]"
      >
        <Link href={routes.vehicles}>
          <CarFront />
          Fahrzeuge entdecken
        </Link>
      </Button>
    </div>
  );
}
