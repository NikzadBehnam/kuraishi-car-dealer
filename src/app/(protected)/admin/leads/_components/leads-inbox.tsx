"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarPlus,
  CheckCircle2,
  Clock3,
  Inbox,
  Mail,
  MessageSquareText,
  Phone,
  Search,
  XCircle,
} from "lucide-react";

import type {
  AdminActivityEvent,
  AdminLead,
  AdminLeadPriority,
  AdminLeadSource,
  AdminLeadStatus,
  AdminUser,
  AdminVehicle,
} from "@/types/admin";
import { adminRoutes } from "@/config/admin-routes.config";
import { formatMileage } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type LeadTab = "all" | AdminLeadStatus;

const leadTabs: Array<{ value: LeadTab; label: string }> = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "closed", label: "Closed" },
  { value: "lost", label: "Lost" },
];

const leadTabClassName =
  "min-h-9 flex-1 basis-[7rem] bg-secondary px-3 text-xs sm:flex-none sm:text-sm";

const statusLabels: Record<AdminLeadStatus, string> = {
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

const sourceLabels: Record<AdminLeadSource, string> = {
  contact: "Contact",
  valuation: "Valuation",
  "test-drive": "Test drive",
  callback: "Callback",
};

const dateTime = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function LeadsInbox({
  leads,
  vehicles,
  users,
  activityEvents,
}: {
  leads: AdminLead[];
  vehicles: AdminVehicle[];
  users: AdminUser[];
  activityEvents: AdminActivityEvent[];
}) {
  const [activeTab, setActiveTab] = useState<LeadTab>("all");
  const [query, setQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de");

    return leads
      .filter((lead) => activeTab === "all" || lead.status === activeTab)
      .filter((lead) => {
        if (!normalizedQuery) return true;
        const vehicle = getLeadVehicle(lead, vehicles);
        return [
          lead.customerName,
          lead.customerEmail,
          lead.customerPhone ?? "",
          lead.message,
          vehicle?.make ?? "",
          vehicle?.model ?? "",
          lead.valuationVehicle?.make ?? "",
          lead.valuationVehicle?.model ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("de")
          .includes(normalizedQuery);
      })
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [activeTab, leads, query, vehicles]);

  const selectedLead =
    leads.find((lead) => lead.id === selectedLeadId) ?? null;

  return (
    <div className="grid min-w-0 gap-4">
      <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Leads inbox</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              UI-only intake board for contact, valuation, and test-drive
              requests.
            </p>
          </div>
          <Button
            asChild
            variant="accent"
            className="w-full rounded-[var(--radius-sm)] sm:w-auto"
          >
            <Link href={adminRoutes.appointments}>
              <CalendarPlus />
              Schedule
            </Link>
          </Button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customer, contact, vehicle, message"
              aria-label="Search leads"
              className="bg-background pl-9"
            />
          </div>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as LeadTab)}
            className="min-w-0"
          >
            <TabsList className="flex h-auto min-h-0 w-full flex-wrap items-stretch justify-start gap-1 bg-transparent p-0 lg:w-auto">
              {leadTabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  className={leadTabClassName}
                  value={tab.value}
                >
                  {tab.label}
                  <span className="ml-2 rounded-full bg-background px-1.5 py-0.5 text-[0.65rem]">
                    {countLeads(leads, tab.value)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <Card className="min-w-0 overflow-hidden rounded-[var(--radius-sm)]">
        {filteredLeads.length ? (
          <>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-3">Source</TableHead>
                    <TableHead className="px-3">Customer</TableHead>
                    <TableHead className="px-3">Vehicle interest</TableHead>
                    <TableHead className="px-3">Status</TableHead>
                    <TableHead className="px-3">Priority</TableHead>
                    <TableHead className="px-3 text-right">Created</TableHead>
                    <TableHead className="w-24 px-3 text-right">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <LeadTableRow
                      key={lead.id}
                      lead={lead}
                      vehicle={getLeadVehicle(lead, vehicles)}
                      onOpen={() => setSelectedLeadId(lead.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid min-w-0 md:hidden">
              {filteredLeads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  vehicle={getLeadVehicle(lead, vehicles)}
                  onOpen={() => setSelectedLeadId(lead.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyLeadsState />
        )}
      </Card>

      <LeadDetailSheet
        lead={selectedLead}
        vehicle={selectedLead ? getLeadVehicle(selectedLead, vehicles) : undefined}
        assignedUser={selectedLead ? getAssignedUser(selectedLead, users) : undefined}
        activityEvents={selectedLead ? getLeadActivity(selectedLead, activityEvents) : []}
        open={!!selectedLead}
        onOpenChange={(open) => {
          if (!open) setSelectedLeadId(null);
        }}
      />
    </div>
  );
}

function LeadTableRow({
  lead,
  vehicle,
  onOpen,
}: {
  lead: AdminLead;
  vehicle?: AdminVehicle;
  onOpen: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="px-3">
        <SourceBadge source={lead.source} />
      </TableCell>
      <TableCell className="min-w-56 px-3">
        <p className="font-extrabold">{lead.customerName}</p>
        <p className="text-xs text-muted-foreground">{lead.customerEmail}</p>
        {lead.customerPhone && (
          <p className="text-xs text-muted-foreground">{lead.customerPhone}</p>
        )}
      </TableCell>
      <TableCell className="min-w-56 px-3">
        <LeadVehicleInterest lead={lead} vehicle={vehicle} />
      </TableCell>
      <TableCell className="px-3">
        <StatusBadge status={lead.status} />
      </TableCell>
      <TableCell className="px-3">
        <PriorityBadge priority={lead.priority} />
      </TableCell>
      <TableCell className="whitespace-nowrap px-3 text-right text-xs font-bold text-muted-foreground">
        {formatDateTime(lead.createdAt)}
      </TableCell>
      <TableCell className="px-3 text-right">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-[var(--radius-sm)]"
          onClick={onOpen}
        >
          Open
        </Button>
      </TableCell>
    </TableRow>
  );
}

function LeadCard({
  lead,
  vehicle,
  onOpen,
}: {
  lead: AdminLead;
  vehicle?: AdminVehicle;
  onOpen: () => void;
}) {
  return (
    <article className="grid gap-3 border-b p-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={lead.source} />
        <StatusBadge status={lead.status} />
        <PriorityBadge priority={lead.priority} />
      </div>
      <div>
        <h3 className="font-extrabold">{lead.customerName}</h3>
        <p className="text-sm text-muted-foreground">{lead.customerEmail}</p>
        {lead.customerPhone && (
          <p className="text-sm text-muted-foreground">{lead.customerPhone}</p>
        )}
      </div>
      <LeadVehicleInterest lead={lead} vehicle={vehicle} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-bold text-muted-foreground">
          {formatDateTime(lead.createdAt)}
        </span>
        <Button
          type="button"
          variant="outline"
          className="rounded-[var(--radius-sm)]"
          onClick={onOpen}
        >
          Open
        </Button>
      </div>
    </article>
  );
}

function LeadDetailSheet({
  lead,
  vehicle,
  assignedUser,
  activityEvents,
  open,
  onOpenChange,
}: {
  lead: AdminLead | null;
  vehicle?: AdminVehicle;
  assignedUser?: AdminUser;
  activityEvents: AdminActivityEvent[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[min(44rem,calc(100vw-1rem))] overflow-hidden p-0"
      >
        <ScrollArea className="h-full">
          <div className="grid min-w-0 gap-5 p-4 pt-12 sm:p-5 sm:pr-12">
            <SheetHeader>
              <div className="flex flex-wrap gap-2">
                <SourceBadge source={lead.source} />
                <StatusBadge status={lead.status} />
                <PriorityBadge priority={lead.priority} />
              </div>
              <SheetTitle>{lead.customerName}</SheetTitle>
              <SheetDescription>
                Created {formatDateTime(lead.createdAt)} from{" "}
                {sourceLabels[lead.source].toLowerCase()}.
              </SheetDescription>
            </SheetHeader>

            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              <Button
                asChild
                variant="outline"
                className="w-full rounded-[var(--radius-sm)]"
              >
                <a href={lead.customerPhone ? `tel:${lead.customerPhone}` : "#"}>
                  <Phone />
                  Call
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full rounded-[var(--radius-sm)]"
              >
                <a href={`mailto:${lead.customerEmail}`}>
                  <Mail />
                  Email
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full whitespace-normal rounded-[var(--radius-sm)] text-center"
              >
                <Link href={adminRoutes.appointments}>
                  <CalendarPlus />
                  Schedule appointment
                </Link>
              </Button>
              <Button
                type="button"
                variant="accent"
                className="w-full rounded-[var(--radius-sm)]"
                onClick={() => toast.info("Mark contacted is UI-only.")}
              >
                <CheckCircle2 />
                Mark contacted
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-[var(--radius-sm)] sm:col-span-2"
                onClick={() => toast.info("Close lead is UI-only.")}
              >
                <XCircle />
                Close
              </Button>
            </div>

            <DetailSection title="Customer">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Name" value={lead.customerName} />
                <Info label="Email" value={lead.customerEmail} />
                <Info label="Phone" value={lead.customerPhone ?? "Not provided"} />
                <Info
                  label="Assigned to"
                  value={assignedUser?.name ?? "Unassigned"}
                />
              </div>
            </DetailSection>

            <DetailSection title="Vehicle interest">
              <LeadVehicleInterest lead={lead} vehicle={vehicle} expanded />
            </DetailSection>

            <DetailSection title="Message">
              <p className="text-sm leading-6 text-muted-foreground">
                {lead.message}
              </p>
            </DetailSection>

            <DetailSection title="Timeline">
              <div className="grid gap-4">
                <TimelineItem
                  Icon={Inbox}
                  title="Lead created"
                  text={`${sourceLabels[lead.source]} request entered the admin inbox.`}
                  time={lead.createdAt}
                />
                {lead.updatedAt !== lead.createdAt && (
                  <TimelineItem
                    Icon={Clock3}
                    title="Lead updated"
                    text={`Status is ${statusLabels[lead.status].toLowerCase()}.`}
                    time={lead.updatedAt}
                  />
                )}
                {activityEvents.map((event) => (
                  <TimelineItem
                    key={event.id}
                    Icon={MessageSquareText}
                    title={event.summary}
                    text={event.targetLabel}
                    time={event.occurredAt}
                  />
                ))}
              </div>
            </DetailSection>

            <DetailSection title="Internal notes">
              <Textarea
                rows={5}
                defaultValue={`Existing notes: ${lead.notesCount}`}
                aria-label="Internal lead notes"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-[var(--radius-sm)]"
                  onClick={() => toast.info("Internal notes are UI-only.")}
                >
                  Save note
                </Button>
              </div>
            </DetailSection>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[var(--radius-sm)] border bg-background p-4">
      <h3 className="text-sm font-extrabold">{title}</h3>
      <Separator className="my-3" />
      {children}
    </section>
  );
}

function TimelineItem({
  Icon,
  title,
  text,
  time,
}: {
  Icon: typeof Inbox;
  title: string;
  text: string;
  time: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-3">
      <span className="grid size-9 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-extrabold">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted-foreground">
          {text}
        </span>
        <span className="mt-1 block text-xs font-bold text-muted-foreground">
          {formatDateTime(time)}
        </span>
      </span>
    </div>
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

function LeadVehicleInterest({
  lead,
  vehicle,
  expanded = false,
}: {
  lead: AdminLead;
  vehicle?: AdminVehicle;
  expanded?: boolean;
}) {
  if (vehicle) {
    return (
      <div className={cn("min-w-0", expanded && "grid gap-2")}>
        <p className="truncate font-bold">
          {vehicle.make} {vehicle.model}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {vehicle.stockNumber} - {vehicle.variant}
        </p>
        {expanded && (
          <p className="text-sm text-muted-foreground">
            {formatMileage(vehicle.mileage)} - {vehicle.location}
          </p>
        )}
      </div>
    );
  }

  if (lead.valuationVehicle) {
    return (
      <div className={cn("min-w-0", expanded && "grid gap-2")}>
        <p className="truncate font-bold">
          {lead.valuationVehicle.make} {lead.valuationVehicle.model}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          Trade-in valuation - {formatMileage(lead.valuationVehicle.mileage)}
        </p>
        {expanded && (
          <p className="text-sm text-muted-foreground">
            First registration {lead.valuationVehicle.firstRegistration}
          </p>
        )}
      </div>
    );
  }

  return (
    <p className="text-sm font-semibold text-muted-foreground">
      No vehicle linked
    </p>
  );
}

function EmptyLeadsState() {
  return (
    <div className="grid min-h-72 place-items-center p-8 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
          <Inbox className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-extrabold">No leads found</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Change the selected status tab or search term to review more mocked
          lead records.
        </p>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: AdminLeadSource }) {
  return (
    <Badge className="bg-secondary text-secondary-foreground dark:bg-secondary">
      {sourceLabels[source]}
    </Badge>
  );
}

function StatusBadge({ status }: { status: AdminLeadStatus }) {
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
      {statusLabels[status]}
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

function getLeadVehicle(lead: AdminLead, vehicles: AdminVehicle[]) {
  return lead.vehicleId
    ? vehicles.find((vehicle) => vehicle.id === lead.vehicleId)
    : undefined;
}

function getAssignedUser(lead: AdminLead, users: AdminUser[]) {
  return lead.assignedToUserId
    ? users.find((user) => user.id === lead.assignedToUserId)
    : undefined;
}

function getLeadActivity(
  lead: AdminLead,
  activityEvents: AdminActivityEvent[],
) {
  return activityEvents
    .filter((event) => event.targetType === "lead" && event.targetId === lead.id)
    .toSorted((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function countLeads(leads: AdminLead[], tab: LeadTab) {
  return tab === "all"
    ? leads.length
    : leads.filter((lead) => lead.status === tab).length;
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}
