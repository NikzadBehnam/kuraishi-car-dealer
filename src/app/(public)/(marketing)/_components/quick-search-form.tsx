"use client";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
      <Select name="make">
        <SelectTrigger aria-label="Marke">
          <SelectValue placeholder="Alle Marken" />
        </SelectTrigger>
        <SelectContent>
          {[...new Set(vehicles.map((vehicle) => vehicle.make))]
            .toSorted()
            .map((make) => (
              <SelectItem key={make} value={make}>
                {make}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Select name="bodyType">
        <SelectTrigger aria-label="Fahrzeugtyp">
          <SelectValue placeholder="Alle Fahrzeugtypen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="suv">SUV</SelectItem>
          <SelectItem value="compact">Kleinwagen</SelectItem>
          <SelectItem value="sedan">Limousine</SelectItem>
          <SelectItem value="wagon">Kombi</SelectItem>
        </SelectContent>
      </Select>
      <Select name="maximumPrice">
        <SelectTrigger aria-label="Preis bis">
          <SelectValue placeholder="Preis bis" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="30000">30.000 €</SelectItem>
          <SelectItem value="40000">40.000 €</SelectItem>
          <SelectItem value="50000">50.000 €</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="accent" type="submit" className="rounded-[15px]">
        <Search />
        Suchen
      </Button>
    </form>
  );
}
