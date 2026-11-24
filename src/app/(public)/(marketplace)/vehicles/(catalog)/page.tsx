import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { VehicleSearchResults } from "../_components/vehicle-search-results";
import { vehicleListingContent as content } from "@/content/de/vehicle-listing";
import { createPublicMetadata } from "@/lib/metadata";
import { publicRoutes } from "@/config/routes.config";
import { listPublicVehicles } from "@/lib/inventory-queries";
import { listPublicVehicleCardImages } from "@/lib/media-attachments";
import { Button } from "@/components/ui/button";
import {
  PUBLIC_CATALOG_PAGE_SIZE,
  publicCatalogSearchParamsSchema,
} from "@/lib/inventory-validation";

export async function generateMetadata() {
  return createPublicMetadata(
    "Fahrzeuge",
    content.description,
    publicRoutes.vehicles,
  );
}
export const dynamic = "force-dynamic";

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const search = publicCatalogSearchParamsSchema.safeParse({
    q: params.q,
    page: params.page,
  });

  if (!search.success) {
    return (
      <>
        <PageHeader
          title={content.title}
          description={content.description}
          breadcrumb="Fahrzeuge"
        />
        <div className="site-container py-16 text-center" role="alert">
          <h2 className="section-title">{content.invalidSearch}</h2>
          <p className="text-muted-foreground mt-3">
            {content.invalidSearchHint}
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href={publicRoutes.vehicles}>{content.clearSearch}</Link>
          </Button>
        </div>
      </>
    );
  }

  const { q: query, page } = search.data;
  const inventory = await listPublicVehicles({
    search: query,
    page,
    pageSize: PUBLIC_CATALOG_PAGE_SIZE,
  });
  const imagesByVehicleId = await listPublicVehicleCardImages(
    inventory.items.map(({ id }) => id),
  );

  return (
    <>
      <PageHeader
        title={content.title}
        description={content.description}
        breadcrumb="Fahrzeuge"
      />
      <VehicleSearchResults
        inventory={inventory}
        imagesByVehicleId={imagesByVehicleId}
        query={query}
      />
    </>
  );
}
