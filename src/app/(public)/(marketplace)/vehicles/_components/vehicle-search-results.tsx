"use client";
import { useMemo, useState } from "react";
import type { Vehicle } from "@/types/vehicle";
import { filterVehicles, type VehicleFilters } from "@/lib/vehicle-filters";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { EmptyState } from "@/components/shared/empty-state";
import { VehicleFilterBar } from "./vehicle-filter-bar";
export function VehicleSearchResults({
  vehicles,
  initialFilters,
}: {
  vehicles: Vehicle[];
  initialFilters: VehicleFilters;
}) {
  const [filters, setFilters] = useState(initialFilters);
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
    <section>
      <VehicleFilterBar
        vehicles={vehicles}
        filters={filters}
        resultCount={results.length}
        onFilterChange={update}
        onReset={() => setFilters({})}
      />
      <div className="site-container py-9">
        {results.length ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
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
      </div>
    </section>
  );
}
