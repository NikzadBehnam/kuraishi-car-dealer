import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div className="site-container space-y-5 py-20">
      <Skeleton className="h-14 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-96" />
    </div>
  );
}
