import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSettingsLoading() {
  return (
    <div className="grid gap-4">
      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
        <div className="mt-4 flex gap-2 overflow-hidden rounded-[var(--radius-sm)] bg-secondary p-1">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-8 w-32 shrink-0 rounded-[var(--radius-sm)]"
            />
          ))}
        </div>
      </section>

      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-72 max-w-full" />
        <div className="my-4 h-px bg-border" />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="grid gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9 w-full rounded-[var(--radius-sm)]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
