import { Skeleton } from "@/components/ui/skeleton";

export default function MarketplaceLoading() {
  return (
    <div
      className="site-container space-y-5 py-16"
      aria-label="Fahrzeugmarkt wird geladen"
    >
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton className="aspect-[4/3]" key={index} />
        ))}
      </div>
    </div>
  );
}
