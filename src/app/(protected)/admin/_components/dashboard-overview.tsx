import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  CarFront,
  CircleDollarSign,
  ClipboardPlus,
  Clock3,
  Inbox,
  Plus,
  Users,
  type LucideIcon,
} from "lucide-react";

import {
  adminActivityEvents,
  adminAppointments,
  adminLeads,
  adminUsers,
  adminVehicles,
} from "@/data/admin";
import type {
  AdminActivityEvent,
  AdminLead,
  AdminLeadPriority,
  AdminLeadStatus,
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

const leadStatusLabels: Record<AdminLeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  closed: "Closed",
  lost: "Lost",
};

const priorityLabels: Record<AdminLeadPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

const activityIcons: Record<AdminActivityEvent["type"], LucideIcon> = {
  login: Users,
  favourite: CarFront,
  comparison: Activity,
  inquiry: Inbox,
  valuation: ClipboardPlus,
  update: Clock3,
};

export function DashboardOverview() {
  const openLeads = adminLeads.filter(
    (lead) => !["closed", "lost"].includes(lead.status),
  );
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
      label: "New leads",
      value: integer.format(
        adminLeads.filter((lead) => lead.status === "new").length,
      ),
      helper: `${openLeads.length} open lead workflows`,
      Icon: Inbox,
      tone: "accent",
    },
    {
      label: "Appointments",
      value: integer.format(adminAppointments.length),
      helper: "Requested and scheduled",
      Icon: CalendarDays,
      tone: "info",
    },
    {
      label: "Users",
      value: integer.format(adminUsers.length),
      helper: "Clients, staff, admins",
      Icon: Users,
      tone: "success",
    },
    {
      label: "Sold vehicles",
      value: integer.format(soldVehicles.length),
      helper: "Closed inventory records",
      Icon: Activity,
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
  const recentActivity = [...adminActivityEvents]
    .toSorted((a, b) => b.occurredAt.localeCompare(a.occurredAt))
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
                tone === "info" && "bg-info/10 text-info",
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

      <section className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <RecentActivity events={recentActivity} />
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
    {
      label: "Schedule appointment",
      href: adminRoutes.appointments,
      Icon: CalendarDays,
      variant: "outline" as const,
    },
    {
      label: "Manage users",
      href: adminRoutes.users,
      Icon: Users,
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

function RecentActivity({ events }: { events: AdminActivityEvent[] }) {
  return (
    <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
      <SectionHeading
        title="Recent activity"
        description="Latest mocked client and staff events."
        href={adminRoutes.activity}
      />
      <div className="mt-4 grid gap-4">
        {events.map((event, index) => {
          const Icon = activityIcons[event.type];

          return (
            <div key={event.id} className="grid grid-cols-[auto_1fr] gap-3">
              <div className="grid justify-items-center">
                <span className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                {index < events.length - 1 && (
                  <span className="mt-2 h-full w-px bg-border" />
                )}
              </div>
              <div className="min-w-0 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-extrabold">
                    {event.actorName}
                  </p>
                  <ActivityBadge severity={event.severity}>
                    {event.type}
                  </ActivityBadge>
                </div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {event.summary}
                </p>
                <p className="mt-1 text-xs font-bold text-muted-foreground">
                  {formatDateTime(event.occurredAt)} - {event.targetLabel}
                </p>
              </div>
            </div>
          );
        })}
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
              <TableHead className="bg-surface px-3">Status</TableHead>
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
                <TableCell className="px-3">
                  <div className="flex flex-wrap gap-1.5">
                    <LeadStatusBadge status={lead.status} />
                    <PriorityBadge priority={lead.priority} />
                  </div>
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
      <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
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
        <p>
          <strong className="text-foreground">
            {integer.format(
              adminVehicles.reduce((sum, item) => sum + item.favourites, 0),
            )}
          </strong>{" "}
          saved vehicle events
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

function LeadStatusBadge({ status }: { status: AdminLeadStatus }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        status === "new" && "bg-accent/10 text-accent",
        status === "contacted" && "bg-info/10 text-info",
        status === "qualified" && "bg-success/10 text-success",
        status === "closed" && "bg-secondary text-secondary-foreground",
        status === "lost" && "bg-destructive/10 text-destructive",
      )}
    >
      {leadStatusLabels[status]}
    </Badge>
  );
}

function PriorityBadge({ priority }: { priority: AdminLeadPriority }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        priority === "high" && "bg-warning/10 text-warning",
        priority === "urgent" && "bg-destructive/10 text-destructive",
      )}
    >
      {priorityLabels[priority]}
    </Badge>
  );
}

function ActivityBadge({
  severity,
  children,
}: {
  severity: AdminActivityEvent["severity"];
  children: React.ReactNode;
}) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        severity === "success" && "bg-success/10 text-success",
        severity === "warning" && "bg-warning/10 text-warning",
        severity === "risk" && "bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </Badge>
  );
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}
