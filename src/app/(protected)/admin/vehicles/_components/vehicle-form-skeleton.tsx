import { Skeleton } from "@/components/ui/skeleton";

export function VehicleFormSkeleton() {
  return (
    <div className="grid gap-4">
      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-[var(--radius-sm)]" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-4 h-7 w-40" />
            <Skeleton className="mt-2 h-4 w-80 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-9 w-28 rounded-[var(--radius-sm)]"
              />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-sm)] border bg-surface p-2">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-8 w-28 shrink-0 rounded-[var(--radius-sm)]"
            />
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        <div className="my-4 h-px bg-border" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="grid gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-full rounded-[var(--radius-sm)]" />
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-28 w-full rounded-[var(--radius-sm)]" />
        </div>
      </section>
    </div>
  );
}
