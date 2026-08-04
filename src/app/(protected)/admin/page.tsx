import { Activity, CarFront, Inbox, Users } from "lucide-react";

import { Card } from "@/components/ui/card";

const dashboardStats = [
  { label: "Listed vehicles", value: "24", Icon: CarFront },
  { label: "Open leads", value: "8", Icon: Inbox },
  { label: "Registered users", value: "156", Icon: Users },
  { label: "Recent activity", value: "43", Icon: Activity },
] as const;

export default function AdminDashboardPage() {
  return (
    <div className="grid gap-6">
      <section className="rounded-[var(--radius-sm)] border bg-surface p-5">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight">
          Dashboard foundation
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          UI-only admin area for inventory, leads, appointments, users,
          activity, media, and settings. Backend, authentication, and
          persistence will be connected in a later phase.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map(({ label, value, Icon }) => (
          <Card
            key={label}
            className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-[var(--radius-sm)] p-5"
          >
            <span className="grid size-11 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-sm font-bold text-muted-foreground">
                {label}
              </span>
              <strong className="mt-1 block text-2xl">{value}</strong>
            </span>
          </Card>
        ))}
      </section>
    </div>
  );
}
