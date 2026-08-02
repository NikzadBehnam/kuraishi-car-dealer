"use client";
import { useMemo, useState } from "react";
import { Filter, RotateCcw, X } from "lucide-react";
import type { Vehicle } from "@/types/vehicle";
import { filterVehicles, type VehicleFilters } from "@/lib/vehicle-filters";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
export function VehicleSearchResults({
  vehicles,
  initialFilters,
}: {
  vehicles: Vehicle[];
  initialFilters: VehicleFilters;
}) {
  const [filters, setFilters] = useState(initialFilters);
  const [open, setOpen] = useState(false);
  const results = useMemo(
    () => filterVehicles(vehicles, filters),
    [vehicles, filters],
  );
  const update = (key: keyof VehicleFilters, value: string) =>
    setFilters((current) => ({
      ...current,
      [key]:
        key === "maximumPrice"
          ? Number(value) || undefined
          : value || undefined,
    }));
  return (
    <div className="site-container grid gap-7 py-9 lg:grid-cols-[17.5rem_1fr]">
      <aside
        className={`${open ? "fixed inset-0 z-60 overflow-auto" : "hidden"} bg-surface p-6 lg:sticky lg:top-24 lg:block lg:self-start lg:rounded lg:border lg:shadow-sm`}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">{content.filters}</h2>
          <Button
            className="lg:hidden"
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            aria-label="Filter schließen"
          >
            <X />
          </Button>
        </div>
        <FilterSelect
          label={content.make}
          value={filters.make}
          onChange={(value) => update("make", value)}
          options={[...new Set(vehicles.map((vehicle) => vehicle.make))]
            .toSorted()
            .map((value) => [value, value])}
        />
        <FilterSelect
          label={content.bodyType}
          value={filters.bodyType}
          onChange={(value) => update("bodyType", value)}
          options={[
            ["suv", "SUV"],
            ["compact", "Kleinwagen"],
            ["sedan", "Limousine"],
            ["wagon", "Kombi"],
            ["van", "Transporter"],
            ["sports", "Sportwagen"],
          ]}
        />
        <FilterSelect
          label={content.fuelType}
          value={filters.fuelType}
          onChange={(value) => update("fuelType", value)}
          options={[
            ["petrol", "Benzin"],
            ["diesel", "Diesel"],
            ["electric", "Elektro"],
            ["hybrid", "Hybrid"],
          ]}
        />
        <FilterSelect
          label={content.maximumPrice}
          value={String(filters.maximumPrice ?? "")}
          onChange={(value) => update("maximumPrice", value)}
          options={[
            ["30000", "30.000 €"],
            ["40000", "40.000 €"],
            ["50000", "50.000 €"],
          ]}
        />
        <Button
          className="w-full rounded-[15px]"
          variant="outline"
          onClick={() => setFilters({})}
        >
          <RotateCcw />
          Alle Filter zurücksetzen
        </Button>
      </aside>
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-extrabold">
              {results.length} {content.results}
            </p>
            <p className="text-muted-foreground text-sm">
              Standort Düsseldorf · 100 km
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              className="lg:hidden"
              variant="outline"
              onClick={() => setOpen(true)}
            >
              <Filter />
              Filter
            </Button>
            <Select
              value={filters.sort ?? "relevance"}
              onValueChange={(value) =>
                update("sort", value === "relevance" ? "" : value)
              }
            >
              <SelectTrigger aria-label={content.sort} className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevanz</SelectItem>
                <SelectItem value="price-asc">Preis aufsteigend</SelectItem>
                <SelectItem value="price-desc">Preis absteigend</SelectItem>
                <SelectItem value="newest">Neueste Angebote</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {results.length ? (
          <div className="grid gap-5 md:grid-cols-2">
            {results.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={content.noResults}
            description={content.noResultsHint}
          />
        )}
      </section>
    </div>
  );
}
function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  options: string[][];
}) {
  return (
    <div className="field mb-5">
      <span>{label}</span>
      <Select
        value={value ?? "all"}
        onValueChange={(value) => onChange(value === "all" ? "" : value)}
      >
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle</SelectItem>
          {options.map(([value, label]) => (
            <SelectItem value={value} key={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
