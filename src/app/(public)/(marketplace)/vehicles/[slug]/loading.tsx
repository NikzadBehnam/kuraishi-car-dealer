import { Skeleton } from "@/components/ui/skeleton";

export default function VehicleDetailsLoading() {
  return (
    <div className="site-container grid gap-7 py-10 lg:grid-cols-[1.4fr_.75fr]">
      <div className="space-y-5">
        <Skeleton className="aspect-[16/10]" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton className="h-20" key={index} />
          ))}
        </div>
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
