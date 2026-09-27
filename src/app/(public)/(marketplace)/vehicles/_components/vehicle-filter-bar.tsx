"use client";

import { SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import { publicRoutes } from "@/config/routes.config";
import { createPublicVehicleListingSearchParams } from "@/features/vehicles/listing-search-params.ts";
import type { PublicVehicleListQuery } from "@/features/vehicles/schemas.ts";

type VisibleFilterKey =
  "bodyType" | "fuelType" | "make" | "maximumPrice" | "sort";

interface VehicleFilterBarProps {
  query: PublicVehicleListQuery;
  makeOptions: string[];
  resultCount: number;
}

export function VehicleFilterBar({
  query,
  makeOptions,
  resultCount,
}: VehicleFilterBarProps) {
  const router = useRouter();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const activeFilterCount = [
    query.make,
    query.model,
    query.bodyType,
    query.condition,
    query.featured,
    query.fuelType,
    query.maximumMileage,
    query.maximumPriceCents,
    query.minimumPriceCents,
    query.search,
    query.transmissionType,
  ].filter((value) => value !== undefined && value !== "").length;

  const updateFilter = (key: VisibleFilterKey, value: string) => {
    const params = createPublicVehicleListingSearchParams(query);

    params.delete("page");
    if (value) params.set(key, value);
    else params.delete(key);

    startTransition(() => {
      const queryString = params.toString();
      router.push(
        queryString
          ? `${publicRoutes.vehicles}?${queryString}`
          : publicRoutes.vehicles,
      );
    });
  };

  return (
    <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-[var(--header-height)] z-40 border-y py-3 backdrop-blur lg:py-4">
      <div className="site-container">
        <div
          className="flex items-center justify-between gap-3 lg:mb-3"
          aria-busy={isPending}
        >
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
            value={query.make}
            disabled={isPending}
            onChange={(value) => updateFilter("make", value)}
            options={makeOptions.map((value) => [value, value] as const)}
          />
          <FilterSelect
            label={content.bodyType}
            value={query.bodyType}
            disabled={isPending}
            onChange={(value) => updateFilter("bodyType", value)}
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
            value={query.fuelType}
            disabled={isPending}
            onChange={(value) => updateFilter("fuelType", value)}
            options={[
              ["petrol", "Benzin"],
              ["diesel", "Diesel"],
              ["electric", "Elektro"],
              ["hybrid", "Hybrid"],
            ]}
          />
          <FilterSelect
            label={content.maximumPrice}
            value={
              query.maximumPriceCents === undefined
                ? undefined
                : String(query.maximumPriceCents / 100)
            }
            disabled={isPending}
            onChange={(value) => updateFilter("maximumPrice", value)}
            options={[
              ["30000", "30.000 €"],
              ["40000", "40.000 €"],
              ["50000", "50.000 €"],
            ]}
          />
          <FilterSelect
            label={content.sort}
            value={query.sort === "featured" ? "relevance" : query.sort}
            disabled={isPending}
            includeAllOption={false}
            onChange={(value) =>
              updateFilter("sort", value === "relevance" ? "" : value)
            }
            options={[
              ["relevance", "Relevanz"],
              ["price-asc", "Preis aufsteigend"],
              ["price-desc", "Preis absteigend"],
              ["newest", "Neueste Angebote"],
              ["mileage-asc", "Kilometerstand aufsteigend"],
              ["mileage-desc", "Kilometerstand absteigend"],
            ]}
          />
          <div className="grid min-w-0 content-end">
            <Button
              className="w-full rounded-[var(--radius-sm)] lg:w-auto"
              variant="outline"
              disabled={isPending || activeFilterCount === 0}
              onClick={() => {
                setFiltersOpen(false);
                startTransition(() => router.push(publicRoutes.vehicles));
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
  disabled = false,
  includeAllOption = true,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  disabled?: boolean;
  includeAllOption?: boolean;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <div className="grid min-w-0 gap-1.5">
      <span className="text-muted-foreground text-xs font-bold">{label}</span>
      <Select
        disabled={disabled}
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
