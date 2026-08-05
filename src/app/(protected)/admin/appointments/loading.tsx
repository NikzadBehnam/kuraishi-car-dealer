import { Skeleton } from "@/components/ui/skeleton";

export default function AdminAppointmentsLoading() {
  return (
    <div className="grid gap-4">
      <section className="grid gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="rounded-[var(--radius-sm)] border bg-surface p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-3 h-72 w-full rounded-[var(--radius-sm)]" />
        </div>
        <div className="rounded-[var(--radius-sm)] border bg-surface p-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-2 h-4 w-72 max-w-full" />
          <div className="mt-4 grid gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-[var(--radius-sm)] border bg-background p-3 md:grid-cols-[7rem_1fr_8rem]"
              >
                <Skeleton className="h-5 w-20" />
                <div>
                  <Skeleton className="h-5 w-48 max-w-full" />
                  <Skeleton className="mt-2 h-4 w-72 max-w-full" />
                </div>
                <Skeleton className="h-9 w-24 rounded-[var(--radius-sm)]" />
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="rounded-[var(--radius-sm)] border bg-surface p-4">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-12 w-full rounded-[var(--radius-sm)]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
