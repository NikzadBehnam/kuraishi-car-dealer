import { Skeleton } from "@/components/ui/skeleton";

export default function AdminUsersLoading() {
  return (
    <div className="grid gap-4">
      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-2 h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32 rounded-[var(--radius-sm)]" />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_10rem_10rem]">
          <Skeleton className="h-9 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-full rounded-[var(--radius-sm)]" />
        </div>
      </section>

      <section className="overflow-hidden rounded-[var(--radius-sm)] border bg-surface">
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            key={index}
            className="grid gap-3 border-b p-4 last:border-b-0 md:grid-cols-[1fr_8rem_8rem_7rem]"
          >
            <div className="min-w-0">
              <Skeleton className="h-5 w-48 max-w-full" />
              <Skeleton className="mt-2 h-4 w-72 max-w-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-[var(--radius-sm)]" />
          </div>
        ))}
      </section>
    </div>
  );
}
