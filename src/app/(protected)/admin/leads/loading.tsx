import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLeadsLoading() {
  return (
    <div className="grid gap-4">
      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-9 w-36 rounded-[var(--radius-sm)]" />
        </div>
        <div className="mt-4 flex gap-2 overflow-hidden rounded-[var(--radius-sm)] bg-secondary p-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-8 w-24 shrink-0 rounded-[var(--radius-sm)]"
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[var(--radius-sm)] border bg-surface">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="grid gap-3 border-b p-4 last:border-b-0 md:grid-cols-[1fr_10rem_8rem_7rem]"
          >
            <div className="min-w-0">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="mt-2 h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-[var(--radius-sm)]" />
          </div>
        ))}
      </section>
    </div>
  );
}
