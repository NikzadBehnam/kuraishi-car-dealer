"use client";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { vehicles } from "@/data/vehicles";
import { routes } from "@/config/routes.config";
export function QuickSearchForm() {
  const router = useRouter();
  return (
    <form
      className="bg-surface text-foreground mt-8 grid gap-2 rounded-xl p-3 shadow-lg sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]"
      onSubmit={(event) => {
        event.preventDefault();
        const values = new FormData(event.currentTarget);
        const params = new URLSearchParams();
        for (const [key, value] of values)
          if (value) params.set(key, String(value));
        router.push(`${routes.vehicles}?${params}`);
      }}
    >
      <select aria-label="Marke" name="make" className="control">
        <option value="">Alle Marken</option>
        {[...new Set(vehicles.map((vehicle) => vehicle.make))]
          .toSorted()
          .map((make) => (
            <option key={make}>{make}</option>
          ))}
      </select>
      <select aria-label="Fahrzeugtyp" name="bodyType" className="control">
        <option value="">Alle Fahrzeugtypen</option>
        <option value="suv">SUV</option>
        <option value="compact">Kleinwagen</option>
        <option value="sedan">Limousine</option>
        <option value="wagon">Kombi</option>
      </select>
      <select aria-label="Preis bis" name="maximumPrice" className="control">
        <option value="">Preis bis</option>
        <option value="30000">30.000 €</option>
        <option value="40000">40.000 €</option>
        <option value="50000">50.000 €</option>
      </select>
      <Button variant="accent" type="submit">
        <Search />
        Suchen
      </Button>
    </form>
  );
}
