"use client";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { Vehicle } from "@/types/vehicle";
import { filterVehicles } from "@/lib/vehicle-filters";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function VehicleSearchResults({
  vehicles,
  initialQuery,
}: {
  vehicles: Vehicle[];
  initialQuery: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const results = useMemo(
    () => filterVehicles(vehicles, query),
    [vehicles, query],
  );
  return (
    <section>
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-[var(--header-height)] z-40 border-y py-3 backdrop-blur lg:py-4">
        <div className="site-container">
          <div role="search" className="relative w-full max-w-sm">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label={content.search}
              placeholder={content.searchPlaceholder}
              className="bg-surface pr-11 pl-9"
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-1 -translate-y-1/2"
                aria-label={content.clearSearch}
                onClick={() => setQuery("")}
              >
                <X />
              </Button>
            )}
          </div>
        </div>
      </div>
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
