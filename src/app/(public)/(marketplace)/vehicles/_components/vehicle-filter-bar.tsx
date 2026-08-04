"use client";

import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import type { VehicleFilters } from "@/lib/vehicle-filters";
import type { Vehicle } from "@/types/vehicle";

interface VehicleFilterBarProps {
  vehicles: Vehicle[];
  filters: VehicleFilters;
  resultCount: number;
  onFilterChange: (key: keyof VehicleFilters, value: string) => void;
  onReset: () => void;
}

export function VehicleFilterBar({
  vehicles,
  filters,
  resultCount,
  onFilterChange,
  onReset,
}: VehicleFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const makeOptions = [...new Set(vehicles.map((vehicle) => vehicle.make))]
    .toSorted()
    .map((value) => [value, value] as const);
  const activeFilterCount = [
    filters.make,
    filters.bodyType,
    filters.fuelType,
    filters.maximumPrice,
  ].filter(Boolean).length;

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-[var(--header-height)] z-40 border-y py-3 backdrop-blur lg:py-4">
      <div className="site-container">
        <div className="flex items-center justify-between gap-3 lg:mb-3">
          <div>
            <p className="font-extrabold">
              {resultCount} {content.results}
            </p>
            {/* <p className="text-muted-foreground text-sm">
              Standort Wien · 100 km
            </p> */}
          </div>
          <Button
            type="button"
            variant={filtersOpen ? "accent" : "outline"}
            className="rounded-[var(--radius-sm)] lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls="vehicle-filter-controls"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {filtersOpen ? <X /> : <SlidersHorizontal />}
            {filtersOpen ? "Schließen" : "Filter"}
            {activeFilterCount > 0 && !filtersOpen && (
              <span className="bg-accent text-accent-foreground grid size-5 place-items-center rounded-full text-[0.68rem]">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>

        <div
          id="vehicle-filter-controls"
          className={`${filtersOpen ? "mt-4 grid" : "hidden"} gap-3 sm:grid-cols-2 lg:mt-0 lg:grid lg:grid-cols-3 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]`}
        >
          <FilterSelect
            label={content.make}
            value={filters.make}
            onChange={(value) => onFilterChange("make", value)}
            options={makeOptions}
          />
          <FilterSelect
            label={content.bodyType}
            value={filters.bodyType}
            onChange={(value) => onFilterChange("bodyType", value)}
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
            onChange={(value) => onFilterChange("fuelType", value)}
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
            onChange={(value) => onFilterChange("maximumPrice", value)}
            options={[
              ["30000", "30.000 €"],
              ["40000", "40.000 €"],
              ["50000", "50.000 €"],
            ]}
          />
          <FilterSelect
            label={content.sort}
            value={filters.sort ?? "relevance"}
            includeAllOption={false}
            onChange={(value) =>
              onFilterChange("sort", value === "relevance" ? "" : value)
            }
            options={[
              ["relevance", "Relevanz"],
              ["price-asc", "Preis aufsteigend"],
              ["price-desc", "Preis absteigend"],
              ["newest", "Neueste Angebote"],
            ]}
          />
          <div className="grid min-w-0 content-end">
            <Button
              className="w-full rounded-[var(--radius-sm)] lg:w-auto"
              variant="outline"
              onClick={() => {
                onReset();
                setFiltersOpen(false);
              }}
            >
              <RotateCcw />
              Zurücksetzen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  includeAllOption = true,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  includeAllOption?: boolean;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <span className="text-muted-foreground text-xs font-bold">{label}</span>
      <Select
        value={value ?? "all"}
        onValueChange={(value) => onChange(value === "all" ? "" : value)}
      >
        <SelectTrigger aria-label={label} className="bg-surface">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" sideOffset={6} className="z-50">
          {includeAllOption && <SelectItem value="all">Alle</SelectItem>}
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
