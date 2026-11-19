import Link from "next/link";

import { VehicleCatalogSearchForm } from "./vehicle-catalog-search-form";
import { VehicleCard } from "@/components/vehicle/vehicle-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import type {
  InventoryPageDTO,
  PublicInventoryVehicleDTO,
  PublicVehicleCardImageDTO,
} from "@/types/inventory";
import { publicRoutes } from "@/config/routes.config";
import { buildPublicCatalogPageHref } from "@/lib/vehicle-catalog-routing";

export function VehicleSearchResults({
  inventory,
  imagesByVehicleId,
  query,
}: {
  inventory: InventoryPageDTO<PublicInventoryVehicleDTO>;
  imagesByVehicleId: Map<string, PublicVehicleCardImageDTO[]>;
  query: string;
}) {
  const { items, total, page, totalPages } = inventory;
  const firstPageHref = buildPublicCatalogPageHref(query, 1);

  return (
    <section>
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-[var(--header-height)] z-40 border-y py-3 backdrop-blur lg:py-4">
        <div className="site-container">
          <VehicleCatalogSearchForm key={query} query={query} />
        </div>
      </div>
      <div className="site-container py-9">
        <p className="text-muted-foreground mb-5" aria-live="polite">
          {content.resultCount(total)}
        </p>
        {total === 0 ? (
          query ? (
            <EmptyState
              title={content.noResults}
              description={content.noResultsHint}
            />
          ) : (
            <div className="grid justify-items-center py-16 text-center">
              <h2 className="section-title">{content.emptyCatalog}</h2>
              <p className="text-muted-foreground mt-3">
                {content.emptyCatalogHint}
              </p>
              <Button asChild variant="outline" className="mt-6">
                <Link href={publicRoutes.contact}>
                  Persönlich beraten lassen
                </Link>
              </Button>
            </div>
          )
        ) : page > totalPages ? (
          <div className="grid justify-items-center py-16 text-center">
            <h2 className="section-title">{content.pageUnavailable}</h2>
            <Button asChild variant="outline" className="mt-6">
              <Link href={firstPageHref}>Zur ersten Seite</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  inventoryImages={imagesByVehicleId.get(vehicle.id) ?? []}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <nav
                className="mt-9 flex flex-wrap items-center justify-between gap-4"
                aria-label="Fahrzeugseiten"
              >
                {page > 1 ? (
                  <Button asChild variant="outline">
                    <Link href={buildPublicCatalogPageHref(query, page - 1)}>
                      {content.previousPage}
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    {content.previousPage}
                  </Button>
                )}
                <span className="text-muted-foreground" aria-current="page">
                  {content.pageLabel(page, totalPages)}
                </span>
                {page < totalPages ? (
                  <Button asChild variant="outline">
                    <Link href={buildPublicCatalogPageHref(query, page + 1)}>
                      {content.nextPage}
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" disabled>
                    {content.nextPage}
                  </Button>
                )}
              </nav>
            )}
          </>
        )}
      </div>
    </section>
  );
}
