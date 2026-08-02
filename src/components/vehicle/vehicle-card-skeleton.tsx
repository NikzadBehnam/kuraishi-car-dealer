import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
export function VehicleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-16/10 rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-16" />
      </div>
    </Card>
  );
}
