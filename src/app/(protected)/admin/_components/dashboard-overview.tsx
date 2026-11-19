import Link from "next/link";
import { ArrowRight, BadgeCheck, CarFront, Inbox } from "lucide-react";

import { adminLeads } from "@/data/admin";
import type { AdminLead, AdminVehicleStatus } from "@/types/admin";
import type { InventoryDashboardSummaryDTO } from "@/types/inventory";
import { adminRoutes } from "@/config/admin-routes.config";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const integer = new Intl.NumberFormat("de-DE");

const dateTime = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const statusLabels: Record<AdminVehicleStatus, string> = {
  draft: "Draft",
  published: "Published",
  reserved: "Reserved",
  sold: "Sold",
  archived: "Archived",
};

const vehicleStatuses: AdminVehicleStatus[] = [
  "draft",
  "published",
  "reserved",
  "sold",
  "archived",
];

export function DashboardOverview({
  inventorySummary,
}: {
  inventorySummary: InventoryDashboardSummaryDTO;
}) {
  const stats = [
    {
      label: "Inventory",
      value: integer.format(inventorySummary.total),
      helper: "Vehicles tracked in admin",
      Icon: CarFront,
      tone: "primary",
    },
    {
      label: "Leads",
      value: integer.format(adminLeads.length),
      helper: "Contact and vehicle inquiries",
      Icon: Inbox,
      tone: "accent",
    },
    {
      label: "Sold vehicles",
      value: integer.format(inventorySummary.statusCounts.sold),
      helper: "Closed inventory records",
      Icon: BadgeCheck,
      tone: "warning",
    },
  ] as const;

  const recentLeads = [...adminLeads]
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="grid min-w-0 gap-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, helper, Icon, tone }) => (
          <Card
            key={label}
            className="group grid grid-cols-[auto_1fr] items-center gap-4 rounded-[var(--radius-sm)] p-4 transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <span
              className={cn(
                "grid size-11 place-items-center rounded-[var(--radius-sm)]",
                tone === "accent" && "bg-accent/12 text-accent",
                tone === "primary" && "bg-secondary text-primary",
                tone === "warning" && "bg-warning/10 text-warning",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="text-muted-foreground block truncate text-sm font-bold">
                {label}
              </span>
              <strong className="mt-1 block truncate text-2xl tracking-tight">
                {value}
              </strong>
              <span className="text-muted-foreground mt-1 block truncate text-xs">
                {helper}
              </span>
            </span>
          </Card>
        ))}
      </section>

      <section>
        <RecentLeads leads={recentLeads} />
      </section>

      <InventorySummary inventorySummary={inventorySummary} />
    </div>
  );
}

function RecentLeads({ leads }: { leads: AdminLead[] }) {
  return (
    <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
      <SectionHeading
        title="Recent leads"
        description="Newest inquiries from the UI-only intake mock."
        href={adminRoutes.leads}
      />
      <div className="mt-4 min-w-0 overflow-hidden rounded-[var(--radius-sm)] border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="bg-surface px-3">Customer</TableHead>
              <TableHead className="bg-surface px-3">Source</TableHead>
              <TableHead className="bg-surface px-3 text-right">
                Created
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="px-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold">{lead.customerName}</p>
                    <p className="text-muted-foreground truncate text-xs">
                      {lead.customerEmail}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="px-3">
                  <Badge className="bg-secondary text-secondary-foreground dark:bg-secondary">
                    {lead.source}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground px-3 text-right text-xs font-bold">
                  {formatDateTime(lead.createdAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function InventorySummary({
  inventorySummary,
}: {
  inventorySummary: InventoryDashboardSummaryDTO;
}) {
  const statusCounts = vehicleStatuses.map((status) => ({
    status,
    count: inventorySummary.statusCounts[status],
  }));
  const total = inventorySummary.total;

  return (
    <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
      <SectionHeading
        title="Inventory status summary"
        description="Admin-only inventory lifecycle distribution."
        href={adminRoutes.vehicles}
      />
      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {statusCounts.map(({ status, count }) => {
          const percentage =
            total === 0 ? 0 : Math.round((count / total) * 100);

          return (
            <div
              key={status}
              className="bg-background rounded-[var(--radius-sm)] border p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <StatusBadge status={status} />
                <span className="text-sm font-extrabold">{count}</span>
              </div>
              <div className="bg-secondary mt-3 h-2 overflow-hidden rounded-full">
                <div
                  className={cn(
                    "h-full rounded-full",
                    status === "published" && "bg-success",
                    status === "reserved" && "bg-warning",
                    status === "sold" && "bg-info",
                    status === "draft" && "bg-accent",
                    status === "archived" && "bg-muted-foreground",
                  )}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-2 text-xs font-bold">
                {percentage}% of inventory
              </p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SectionHeading({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-extrabold">{title}</h2>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
      </div>
      <Button asChild variant="link" className="h-auto text-sm">
        <Link href={href}>
          Open
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminVehicleStatus }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        status === "published" && "bg-success/10 text-success",
        status === "reserved" && "bg-warning/10 text-warning",
        status === "sold" && "bg-info/10 text-info",
        status === "draft" && "bg-accent/10 text-accent",
        status === "archived" && "bg-muted text-muted-foreground dark:bg-muted",
      )}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}
