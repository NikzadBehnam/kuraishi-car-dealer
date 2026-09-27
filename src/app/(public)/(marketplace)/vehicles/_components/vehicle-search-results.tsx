import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { VehicleFilterBar } from "./vehicle-filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import type { PaginatedResult } from "@/features/shared/pagination.ts";
import type { PublicVehicleCardDto } from "@/features/vehicles/dto.ts";
import { buildPublicVehicleListingHref } from "@/features/vehicles/listing-search-params.ts";
import type { PublicVehicleListQuery } from "@/features/vehicles/schemas.ts";

export function VehicleSearchResults({
  query,
  result,
}: {
  query: PublicVehicleListQuery;
  result: PaginatedResult<PublicVehicleCardDto>;
}) {
  const makeOptions = Array.from(
    new Set([
      ...(query.make ? [query.make] : []),
      ...result.items.map((vehicle) => vehicle.make),
    ]),
  ).toSorted();

  return (
    <section>
      <VehicleFilterBar
        query={query}
        makeOptions={makeOptions}
        resultCount={result.total}
      />
      <div className="site-container py-9">
        {result.items.length ? (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {result.items.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
            <VehiclePagination query={query} result={result} />
          </>
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

function VehiclePagination({
  query,
  result,
}: {
  query: PublicVehicleListQuery;
  result: PaginatedResult<PublicVehicleCardDto>;
}) {
  if (result.totalPages <= 1) return null;

  return (
    <nav
      className="mt-9 flex flex-wrap items-center justify-center gap-3 border-t pt-6"
      aria-label="Fahrzeugseiten"
    >
      {result.hasPreviousPage ? (
        <Button asChild variant="outline">
          <Link href={buildPublicVehicleListingHref(query, result.page - 1)}>
            <ArrowLeft />
            Zurück
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          <ArrowLeft />
          Zurück
        </Button>
      )}
      <span className="text-muted-foreground px-2 text-sm font-semibold">
        Seite {result.page} von {result.totalPages}
      </span>
      {result.hasNextPage ? (
        <Button asChild variant="outline">
          <Link href={buildPublicVehicleListingHref(query, result.page + 1)}>
            Weiter
            <ArrowRight />
          </Link>
        </Button>
      ) : (
        <Button variant="outline" disabled>
          Weiter
          <ArrowRight />
        </Button>
      )}
    </nav>
  );
}
