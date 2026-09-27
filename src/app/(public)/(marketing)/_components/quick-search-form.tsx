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
import type { PublicVehicleSearchFacetsDto } from "@/features/vehicles/dto.ts";
import { routes } from "@/config/routes.config";

export function QuickSearchForm({
  facets,
}: {
  facets: PublicVehicleSearchFacetsDto;
}) {
  const router = useRouter();
  return (
    <form
      className="hero-search mt-8 grid w-full max-w-5xl gap-2 rounded-[var(--radius-md)] border p-3 sm:grid-cols-2 lg:mt-10 lg:grid-cols-[1fr_1fr_1fr_auto]"
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
          {facets.makes.map((make) => (
            <SelectItem key={make.value} value={make.value}>
              {make.value} ({make.count})
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
          <SelectItem value="van">Van / Transporter</SelectItem>
          <SelectItem value="sports">Sportwagen</SelectItem>
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
      <Button variant="accent" type="submit">
        <Search />
        Suchen
      </Button>
    </form>
  );
}
