import { Skeleton } from "@/components/ui/skeleton";

export default function AdminActivityLoading() {
  return (
    <div className="grid gap-4">
      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-9 w-full rounded-[var(--radius-sm)]"
            />
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-[var(--radius-sm)] border bg-surface">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="grid gap-3 border-b p-4 last:border-b-0 md:grid-cols-[1fr_8rem_8rem_8rem]"
          >
            <div className="grid grid-cols-[auto_1fr] gap-3">
              <Skeleton className="size-10 rounded-[var(--radius-sm)]" />
              <div>
                <Skeleton className="h-5 w-56 max-w-full" />
                <Skeleton className="mt-2 h-4 w-80 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-[var(--radius-sm)]" />
          </div>
        ))}
      </section>
    </div>
  );
}
