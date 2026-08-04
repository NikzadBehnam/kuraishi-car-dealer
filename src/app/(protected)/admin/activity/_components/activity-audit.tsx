"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  CarFront,
  Eye,
  Heart,
  Inbox,
  ListFilter,
  Scale,
  Search,
  ShieldAlert,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import type {
  AdminActivityEvent,
  AdminActivitySeverity,
  AdminActivityType,
  AdminUserRole,
} from "@/types/admin";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TypeFilter = "all" | AdminActivityType;
type RoleFilter = "all" | AdminUserRole;
type SeverityFilter = "all" | AdminActivitySeverity;

const typeLabels: Record<AdminActivityType, string> = {
  login: "Login",
  favourite: "Favourite",
  comparison: "Comparison",
  inquiry: "Inquiry",
  valuation: "Valuation",
  update: "Update",
};

const roleLabels: Record<AdminUserRole, string> = {
  client: "Client",
  staff: "Staff",
  admin: "Admin",
};

const severityLabels: Record<AdminActivitySeverity, string> = {
  info: "Info",
  success: "Success",
  warning: "Warning",
  risk: "Risk",
};

const typeIcons: Record<AdminActivityType, LucideIcon> = {
  login: UserRound,
  favourite: Heart,
  comparison: Scale,
  inquiry: Inbox,
  valuation: CarFront,
  update: Activity,
};

const dateTime = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function ActivityAudit({ events }: { events: AdminActivityEvent[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [severityFilter, setSeverityFilter] =
    useState<SeverityFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de");
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return events
      .filter((event) => typeFilter === "all" || event.type === typeFilter)
      .filter((event) => roleFilter === "all" || event.actorRole === roleFilter)
      .filter(
        (event) =>
          severityFilter === "all" || event.severity === severityFilter,
      )
      .filter((event) => {
        const eventTime = new Date(event.occurredAt).getTime();
        return (
          (fromTime === null || eventTime >= fromTime) &&
          (toTime === null || eventTime <= toTime)
        );
      })
      .filter((event) => {
        if (!normalizedQuery) return true;

        return [
          event.actorName,
          event.summary,
          event.targetLabel,
          event.targetType,
          JSON.stringify(event.metadata),
        ]
          .join(" ")
          .toLocaleLowerCase("de")
          .includes(normalizedQuery);
      })
      .toSorted((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  }, [dateFrom, dateTo, events, query, roleFilter, severityFilter, typeFilter]);

  const selectedEvent =
    events.find((event) => event.id === selectedEventId) ?? null;

  const resetFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setRoleFilter("all");
    setSeverityFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="grid gap-4">
      <Card className="rounded-[var(--radius-sm)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold">Activity audit</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Search and filter mocked user, lead, vehicle, and admin events.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="rounded-[var(--radius-sm)]"
            onClick={resetFilters}
          >
            <ListFilter />
            Reset filters
          </Button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem_9rem_9rem]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search actor, target, action, metadata"
              aria-label="Search activity"
              className="bg-background pl-9"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(value) => setTypeFilter(value as TypeFilter)}
          >
            <SelectTrigger aria-label="Filter event type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(typeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value as RoleFilter)}
          >
            <SelectTrigger aria-label="Filter actor role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {Object.entries(roleLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={severityFilter}
            onValueChange={(value) =>
              setSeverityFilter(value as SeverityFilter)
            }
          >
            <SelectTrigger aria-label="Filter severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severity</SelectItem>
              {Object.entries(severityLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            aria-label="Date from"
            className="bg-background"
          />
          <Input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            aria-label="Date to"
            className="bg-background"
          />
        </div>
      </Card>

      <Card className="overflow-hidden rounded-[var(--radius-sm)]">
        {filteredEvents.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3">Event</TableHead>
                <TableHead className="px-3">Actor</TableHead>
                <TableHead className="px-3">Target</TableHead>
                <TableHead className="px-3">Severity</TableHead>
                <TableHead className="px-3 text-right">Timestamp</TableHead>
                <TableHead className="w-24 px-3 text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.map((event) => (
                <ActivityRow
                  key={event.id}
                  event={event}
                  onOpen={() => setSelectedEventId(event.id)}
                />
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyActivityState />
        )}
      </Card>

      <ActivityMetadataDialog
        event={selectedEvent}
        open={!!selectedEvent}
        onOpenChange={(open) => {
          if (!open) setSelectedEventId(null);
        }}
      />
    </div>
  );
}

function ActivityRow({
  event,
  onOpen,
}: {
  event: AdminActivityEvent;
  onOpen: () => void;
}) {
  const Icon = typeIcons[event.type];

  return (
    <TableRow>
      <TableCell className="min-w-80 px-3">
        <div className="grid grid-cols-[auto_1fr] gap-3">
          <span className="grid size-10 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <TypeBadge type={event.type} />
              <span className="text-xs font-bold text-muted-foreground">
                {event.id}
              </span>
            </div>
            <p className="mt-2 font-extrabold">{event.summary}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {formatMetadataSummary(event.metadata)}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="min-w-40 px-3">
        <p className="font-bold">{event.actorName}</p>
        <RoleBadge role={event.actorRole} />
      </TableCell>
      <TableCell className="min-w-48 px-3">
        <p className="font-bold">{event.targetLabel}</p>
        <p className="text-xs text-muted-foreground">
          {event.targetType} - {event.targetId}
        </p>
      </TableCell>
      <TableCell className="px-3">
        <SeverityBadge severity={event.severity} />
      </TableCell>
      <TableCell className="whitespace-nowrap px-3 text-right text-xs font-bold text-muted-foreground">
        {formatDateTime(event.occurredAt)}
      </TableCell>
      <TableCell className="px-3 text-right">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-[var(--radius-sm)]"
          onClick={onOpen}
        >
          <Eye />
          Open
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ActivityMetadataDialog({
  event,
  open,
  onOpenChange,
}: {
  event: AdminActivityEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={event.type} />
            <SeverityBadge severity={event.severity} />
            <RoleBadge role={event.actorRole} />
          </div>
          <DialogTitle>{event.summary}</DialogTitle>
          <DialogDescription>
            {event.actorName} acted on {event.targetLabel} at{" "}
            {formatDateTime(event.occurredAt)}.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <section className="grid gap-3 rounded-[var(--radius-sm)] border bg-background p-4 sm:grid-cols-2">
            <Info label="Event ID" value={event.id} />
            <Info label="Type" value={typeLabels[event.type]} />
            <Info label="Actor" value={event.actorName} />
            <Info label="Actor role" value={roleLabels[event.actorRole]} />
            <Info label="Target type" value={event.targetType} />
            <Info label="Target ID" value={event.targetId} />
          </section>

          <section className="rounded-[var(--radius-sm)] border bg-background p-4">
            <h3 className="text-sm font-extrabold">Metadata</h3>
            <Separator className="my-3" />
            <div className="grid gap-2">
              {Object.entries(event.metadata).map(([key, value]) => (
                <div
                  key={key}
                  className="grid gap-2 rounded-[var(--radius-sm)] border bg-surface p-3 sm:grid-cols-[12rem_1fr]"
                >
                  <span className="text-xs font-bold text-muted-foreground">
                    {key}
                  </span>
                  <span className="text-sm font-semibold">{String(value)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyActivityState() {
  return (
    <div className="grid min-h-72 place-items-center p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
          <ShieldAlert className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-extrabold">No activity events found</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Change the search, date range, or filters to review more mocked audit
          events.
        </p>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: AdminActivityType }) {
  return (
    <Badge className="bg-secondary text-secondary-foreground dark:bg-secondary">
      {typeLabels[type]}
    </Badge>
  );
}

function RoleBadge({ role }: { role: AdminUserRole }) {
  return (
    <Badge
      className={cn(
        "mt-2 bg-secondary text-secondary-foreground dark:bg-secondary",
        role === "admin" && "bg-info/10 text-info",
        role === "staff" && "bg-success/10 text-success",
      )}
    >
      {roleLabels[role]}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: AdminActivitySeverity }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        severity === "success" && "bg-success/10 text-success",
        severity === "warning" && "bg-warning/10 text-warning",
        severity === "risk" && "bg-destructive/10 text-destructive",
      )}
    >
      {severityLabels[severity]}
    </Badge>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}

function formatMetadataSummary(
  metadata: AdminActivityEvent["metadata"],
) {
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(", ");
}
