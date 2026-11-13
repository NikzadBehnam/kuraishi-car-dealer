import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  CircleDollarSign,
  Inbox,
  Plus,
} from "lucide-react";

import { adminLeads, adminVehicles } from "@/data/admin";
import type {
  AdminLead,
  AdminVehicleStatus,
} from "@/types/admin";
import { adminRoutes } from "@/config/admin-routes.config";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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

export function DashboardOverview() {
  const soldVehicles = adminVehicles.filter(
    (vehicle) => vehicle.status === "sold",
  );
  const estimatedRevenue = soldVehicles.reduce(
    (total, vehicle) => total + vehicle.price,
    0,
  );
  const stats = [
    {
      label: "Inventory",
      value: integer.format(adminVehicles.length),
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
      value: integer.format(soldVehicles.length),
      helper: "Closed inventory records",
      Icon: BadgeCheck,
      tone: "warning",
    },
    {
      label: "Revenue estimate",
      value: formatCurrency(estimatedRevenue),
      helper: "Mock sold vehicle total",
      Icon: CircleDollarSign,
      tone: "success",
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
                tone === "success" && "bg-success/10 text-success",
                tone === "warning" && "bg-warning/10 text-warning",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-muted-foreground">
                {label}
              </span>
              <strong className="mt-1 block truncate text-2xl tracking-tight">
                {value}
              </strong>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {helper}
              </span>
            </span>
          </Card>
        ))}
      </section>

      <QuickActions />

      <section>
        <RecentLeads leads={recentLeads} />
      </section>

      <InventorySummary />
    </div>
  );
}

function QuickActions() {
  const actions = [
    {
      label: "Add vehicle",
      href: `${adminRoutes.vehicles}/new`,
      Icon: Plus,
      variant: "accent" as const,
    },
    {
      label: "Review leads",
      href: adminRoutes.leads,
      Icon: Inbox,
      variant: "outline" as const,
    },
  ];

  return (
    <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold">Quick actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            UI-only shortcuts for the upcoming admin workflows.
          </p>
        </div>
        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
          {actions.map(({ label, href, Icon, variant }) => (
            <Button
              key={label}
              asChild
              variant={variant}
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
            >
              <Link href={href}>
                <Icon />
                {label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </Card>
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
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.customerEmail}
                    </p>
                  </div>
                </TableCell>
                <TableCell className="px-3">
                  <Badge className="bg-secondary text-secondary-foreground dark:bg-secondary">
                    {lead.source}
                  </Badge>
                </TableCell>
                <TableCell className="px-3 text-right text-xs font-bold text-muted-foreground">
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

function InventorySummary() {
  const statusCounts = Object.keys(statusLabels).map((status) => ({
    status: status as AdminVehicleStatus,
    count: adminVehicles.filter((vehicle) => vehicle.status === status).length,
  }));
  const total = adminVehicles.length;

  return (
    <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
      <SectionHeading
        title="Inventory status summary"
        description="Admin-only inventory lifecycle distribution."
        href={adminRoutes.vehicles}
      />
      <div className="mt-4 grid gap-3 lg:grid-cols-5">
        {statusCounts.map(({ status, count }) => {
          const percentage = Math.round((count / total) * 100);

          return (
            <div
              key={status}
              className="rounded-[var(--radius-sm)] border bg-background p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <StatusBadge status={status} />
                <span className="text-sm font-extrabold">{count}</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
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
              <p className="mt-2 text-xs font-bold text-muted-foreground">
                {percentage}% of inventory
              </p>
            </div>
          );
        })}
      </div>
      <Separator className="my-4" />
      <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        <p>
          <strong className="text-foreground">
            {integer.format(adminVehicles.reduce((sum, item) => sum + item.views, 0))}
          </strong>{" "}
          total vehicle views
        </p>
        <p>
          <strong className="text-foreground">
            {integer.format(
              adminVehicles.reduce((sum, item) => sum + item.inquiries, 0),
            )}
          </strong>{" "}
          inventory inquiries
        </p>
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
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
        status === "archived" &&
          "bg-muted text-muted-foreground dark:bg-muted",
      )}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}
