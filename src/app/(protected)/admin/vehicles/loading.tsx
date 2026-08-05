import { Skeleton } from "@/components/ui/skeleton";

export default function AdminVehiclesLoading() {
  return (
    <div className="grid gap-4">
      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32 rounded-[var(--radius-sm)]" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem]">
          <Skeleton className="h-9 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-full rounded-[var(--radius-sm)]" />
        </div>
      </section>

      <section className="overflow-hidden rounded-[var(--radius-sm)] border bg-surface">
        <div className="border-b p-3">
          <Skeleton className="h-8 w-56 max-w-full" />
        </div>
        <div className="grid gap-0">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-[2rem_4rem_1fr_6rem] items-center gap-3 border-b p-3 last:border-b-0"
            >
              <Skeleton className="size-4" />
              <Skeleton className="h-12 w-16 rounded-[var(--radius-sm)]" />
              <div className="min-w-0">
                <Skeleton className="h-4 w-52 max-w-full" />
                <Skeleton className="mt-2 h-3 w-36 max-w-full" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
