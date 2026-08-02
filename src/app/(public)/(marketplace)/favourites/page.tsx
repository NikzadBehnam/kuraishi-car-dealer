import { PageHeader } from "@/components/layout/page-header";
import { FavouritesGrid } from "./_components/favourites-grid";
import { publicRoutes } from "@/config/routes.config";
import { createPublicMetadata } from "@/lib/metadata";

export const metadata = createPublicMetadata(
  "Merkliste",
  "Gespeicherte Fahrzeuge auf einen Blick.",
  publicRoutes.favourites,
);
export default function FavouritesPage() {
  return (
    <>
      <PageHeader
        title="Ihre Merkliste"
        description="Gespeicherte Fahrzeuge auf einen Blick."
        breadcrumb="Merkliste"
      />
      <div className="site-container py-10">
        <FavouritesGrid />
      </div>
    </>
  );
}
