import { VehicleCardSkeleton } from "@/components/vehicle/vehicle-card-skeleton";
export default function Loading() {
  return (
    <div className="site-container grid gap-5 py-20 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <VehicleCardSkeleton key={index} />
      ))}
    </div>
  );
}
