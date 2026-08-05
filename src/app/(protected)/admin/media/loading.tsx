import { Skeleton } from "@/components/ui/skeleton";

export default function AdminMediaLoading() {
  return (
    <div className="grid gap-4">
      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="mt-2 h-4 w-80 max-w-full" />
          </div>
          <Skeleton className="h-9 w-32 rounded-[var(--radius-sm)]" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_10rem_10rem]">
          <Skeleton className="h-9 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-full rounded-[var(--radius-sm)]" />
          <Skeleton className="h-9 w-full rounded-[var(--radius-sm)]" />
        </div>
      </section>

      <section className="rounded-[var(--radius-sm)] border border-dashed bg-surface p-6">
        <Skeleton className="mx-auto size-12 rounded-[var(--radius-sm)]" />
        <Skeleton className="mx-auto mt-4 h-5 w-48" />
        <Skeleton className="mx-auto mt-2 h-4 w-72 max-w-full" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-[var(--radius-sm)] border bg-surface"
          >
            <Skeleton className="aspect-[4/3] w-full" />
            <div className="p-3">
              <Skeleton className="h-5 w-40 max-w-full" />
              <Skeleton className="mt-2 h-4 w-28" />
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
