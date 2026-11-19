import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CarFront,
  Inbox,
  MessageCircle,
} from "lucide-react";

import type {
  AdminDashboardInquiry,
  AdminDashboardMetrics,
  AdminLeadSource,
  AdminVehicleStatus,
} from "@/types/admin";
import { adminRoutes } from "@/config/admin-routes.config";
import { buildAdminInquiryDetailHref } from "@/lib/admin-inquiry-validation";
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

const sourceLabels: Record<AdminLeadSource, string> = {
  contact: "Contact",
  "test-drive": "Test drive",
  callback: "Callback",
};

export function DashboardOverview({
  metrics,
}: {
  metrics: AdminDashboardMetrics;
}) {
  const stats = [
    {
      label: "Inventory",
      value: integer.format(metrics.inventoryTotal),
      helper: "All tracked vehicles across statuses",
      Icon: CarFront,
      tone: "primary",
    },
    {
      label: "Leads",
      value: integer.format(metrics.leadCount),
      helper: "Accepted inquiries, all time",
      Icon: Inbox,
      tone: "accent",
    },
    {
      label: "Sold vehicles",
      value: integer.format(metrics.soldCount),
      helper: "Vehicles with a recorded sold date, all time",
      Icon: BadgeCheck,
      tone: "warning",
    },
    {
      label: "Vehicle inquiries",
      value: integer.format(metrics.vehicleInquiryCount),
      helper: "Accepted inquiries with vehicle context, all time",
      Icon: MessageCircle,
      tone: "accent",
    },
  ] as const;

  return (
    <div className="grid min-w-0 gap-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        <RecentLeads leads={metrics.recentInquiries} />
      </section>

      <InventorySummary
        statusCounts={metrics.statusCounts}
        total={metrics.inventoryTotal}
      />
    </div>
  );
}

function RecentLeads({ leads }: { leads: AdminDashboardInquiry[] }) {
  return (
    <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
      <SectionHeading
        title="Recent leads"
        description="Latest accepted inquiries from the staff inbox."
        href={adminRoutes.leads}
      />
      {leads.length ? (
        <div className="mt-4 min-w-0 overflow-hidden rounded-[var(--radius-sm)] border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="bg-surface px-3">Customer</TableHead>
                <TableHead className="bg-surface px-3">Source</TableHead>
                <TableHead className="bg-surface px-3">
                  Vehicle interest
                </TableHead>
                <TableHead className="bg-surface px-3 text-right">
                  Created
                </TableHead>
                <TableHead className="bg-surface px-3 text-right">
                  Action
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
                      {sourceLabels[lead.source]}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-3 text-sm">
                    {lead.vehicleInterest ?? "General inquiry"}
                  </TableCell>
                  <TableCell className="text-muted-foreground px-3 text-right text-xs font-bold">
                    {formatDateTime(lead.createdAt)}
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={buildAdminInquiryDetailHref(lead.id)}>
                        Open
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="bg-background mt-4 grid min-h-32 place-items-center rounded-[var(--radius-sm)] border p-6 text-center">
          <p className="text-muted-foreground text-sm">
            No accepted inquiries yet.
          </p>
        </div>
      )}
    </Card>
  );
}

function InventorySummary({
  statusCounts: counts,
  total,
}: {
  statusCounts: AdminDashboardMetrics["statusCounts"];
  total: number;
}) {
  const statusCounts = vehicleStatuses.map((status) => ({
    status,
    count: counts[status],
  }));

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
