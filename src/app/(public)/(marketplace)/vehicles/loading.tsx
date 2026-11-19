import { VehicleCardSkeleton } from "@/components/vehicle/vehicle-card-skeleton";
export default function Loading() {
  return (
    <div className="site-container space-y-8 py-12">
      <div className="bg-surface h-12 max-w-xl animate-pulse rounded" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 12 }, (_, index) => (
          <VehicleCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
