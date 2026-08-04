import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="grid gap-6">
      <section className="rounded-[var(--radius-sm)] border bg-surface p-5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="mt-4 h-9 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-2 h-4 w-3/4 max-w-xl" />
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
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
    </div>
  );
}
