import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="grid gap-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-[var(--radius-sm)] border bg-surface p-5"
          >
            <Skeleton className="size-11 rounded-[var(--radius-sm)]" />
            <div>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-3 h-7 w-14" />
            </div>
          </div>
        ))}
      </section>
      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-4 w-64 max-w-full" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-9 w-36 rounded-[var(--radius-sm)]"
              />
            ))}
          </div>
        </div>
      </section>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {Array.from({ length: 2 }).map((_, sectionIndex) => (
          <div
            key={sectionIndex}
            className="rounded-[var(--radius-sm)] border bg-surface p-4"
          >
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-2 h-4 w-72 max-w-full" />
            <div className="mt-5 grid gap-3">
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-[var(--radius-sm)]" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="mt-2 h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[var(--radius-sm)] border bg-background p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-5 w-6" />
              </div>
              <Skeleton className="mt-3 h-2 w-full rounded-full" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
