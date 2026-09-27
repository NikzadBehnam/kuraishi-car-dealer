"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
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

import { adminRoutes } from "@/config/admin-routes.config";
import {
  buildAdminLeadListingHref,
  createAdminLeadListingSearchParams,
} from "@/features/leads/admin-listing-search-params";
import type {
  LeadPriority as AdminLeadPriority,
  LeadSource as AdminLeadSource,
  LeadStatus as AdminLeadStatus,
} from "@/features/leads/constants";
import type { AdminLeadDto, AdminLeadListResult } from "@/features/leads/dto";
import type { LeadListQuery } from "@/features/leads/schemas";
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
  query,
  result,
}: {
  query: LeadListQuery;
  result: AdminLeadListResult;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query.search ?? "");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const activeTab: LeadTab = query.status ?? "all";
  const leads = result.items;

  const selectedLead = leads.find((lead) => lead.id === selectedLeadId) ?? null;

  const navigate = (params: URLSearchParams) => {
    const queryString = params.toString();
    const href = queryString
      ? `${adminRoutes.leads}?${queryString}`
      : adminRoutes.leads;

    startTransition(() => router.push(href));
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = createAdminLeadListingSearchParams(query);
    const normalizedSearch = searchValue.trim();

    if (normalizedSearch) params.set("search", normalizedSearch);
    else params.delete("search");

    params.delete("page");
    navigate(params);
  };

  const updateStatus = (value: string) => {
    const params = createAdminLeadListingSearchParams(query);

    if (value === "all") params.delete("status");
    else params.set("status", value);

    params.delete("page");
    navigate(params);
  };

  return (
    <div className={cn("grid min-w-0 gap-4", isPending && "opacity-70")}>
      <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Leads inbox</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Review contact, valuation, and test-drive requests from the lead
              database.
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
          <form className="flex min-w-0 gap-2" onSubmit={submitSearch}>
            <div className="relative min-w-0 flex-1">
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search customer, contact, vehicle, message"
                aria-label="Search leads"
                className="bg-background pl-9"
                disabled={isPending}
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              className="rounded-[var(--radius-sm)]"
              disabled={isPending}
            >
              Search
            </Button>
          </form>
          <Tabs
            value={activeTab}
            onValueChange={updateStatus}
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
                  <span className="bg-background ml-2 rounded-full px-1.5 py-0.5 text-[0.65rem]">
                    {result.statusCounts[tab.value]}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </Card>

      <Card className="min-w-0 overflow-hidden rounded-[var(--radius-sm)]">
        {leads.length ? (
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
                  {leads.map((lead) => (
                    <LeadTableRow
                      key={lead.id}
                      lead={lead}
                      onOpen={() => setSelectedLeadId(lead.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid min-w-0 md:hidden">
              {leads.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
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
        open={!!selectedLead}
        onOpenChange={(open) => {
          if (!open) setSelectedLeadId(null);
        }}
      />

      <LeadPagination query={query} result={result} />
    </div>
  );
}

function LeadTableRow({
  lead,
  onOpen,
}: {
  lead: AdminLeadDto;
  onOpen: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="px-3">
        <SourceBadge source={lead.source} />
      </TableCell>
      <TableCell className="min-w-56 px-3">
        <p className="font-extrabold">{lead.customerName}</p>
        <p className="text-muted-foreground text-xs">{lead.customerEmail}</p>
        {lead.customerPhone && (
          <p className="text-muted-foreground text-xs">{lead.customerPhone}</p>
        )}
      </TableCell>
      <TableCell className="min-w-56 px-3">
        <LeadVehicleInterest lead={lead} />
      </TableCell>
      <TableCell className="px-3">
        <StatusBadge status={lead.status} />
      </TableCell>
      <TableCell className="px-3">
        <PriorityBadge priority={lead.priority} />
      </TableCell>
      <TableCell className="text-muted-foreground px-3 text-right text-xs font-bold whitespace-nowrap">
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
  onOpen,
}: {
  lead: AdminLeadDto;
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
        <p className="text-muted-foreground text-sm">{lead.customerEmail}</p>
        {lead.customerPhone && (
          <p className="text-muted-foreground text-sm">{lead.customerPhone}</p>
        )}
      </div>
      <LeadVehicleInterest lead={lead} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs font-bold">
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
  open,
  onOpenChange,
}: {
  lead: AdminLeadDto | null;
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
                <a
                  href={lead.customerPhone ? `tel:${lead.customerPhone}` : "#"}
                >
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
                className="w-full rounded-[var(--radius-sm)] text-center whitespace-normal"
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
                <Info
                  label="Phone"
                  value={lead.customerPhone ?? "Not provided"}
                />
                <Info
                  label="Assigned to"
                  value={lead.assignedTo?.name ?? "Unassigned"}
                />
                {lead.preferredDate && (
                  <Info
                    label="Preferred date"
                    value={formatDateTime(lead.preferredDate)}
                  />
                )}
              </div>
            </DetailSection>

            <DetailSection title="Vehicle interest">
              <LeadVehicleInterest lead={lead} expanded />
            </DetailSection>

            <DetailSection title="Message">
              <p className="text-muted-foreground text-sm leading-6">
                {lead.message ?? "No message provided."}
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
                {lead.activityEvents.map((event) => (
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
              <p className="text-muted-foreground mb-3 text-sm">
                {lead.noteCount} existing note{lead.noteCount === 1 ? "" : "s"}
              </p>
              <Textarea
                rows={5}
                placeholder="Add an internal note"
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
    <section className="bg-background min-w-0 rounded-[var(--radius-sm)] border p-4">
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
      <span className="bg-secondary text-primary grid size-9 place-items-center rounded-[var(--radius-sm)]">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-extrabold">{title}</span>
        <span className="text-muted-foreground mt-1 block text-sm leading-6">
          {text}
        </span>
        <span className="text-muted-foreground mt-1 block text-xs font-bold">
          {formatDateTime(time)}
        </span>
      </span>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs font-bold">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function LeadVehicleInterest({
  lead,
  expanded = false,
}: {
  lead: AdminLeadDto;
  expanded?: boolean;
}) {
  if (lead.vehicle) {
    return (
      <div className={cn("min-w-0", expanded && "grid gap-2")}>
        <p className="truncate font-bold">
          {lead.vehicle.make} {lead.vehicle.model}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {lead.vehicle.stockNumber} - {lead.vehicle.variant}
        </p>
        {expanded && (
          <p className="text-muted-foreground text-sm">
            {formatMileage(lead.vehicle.mileage)}
          </p>
        )}
      </div>
    );
  }

  if (lead.valuationRequest) {
    return (
      <div className={cn("min-w-0", expanded && "grid gap-2")}>
        <p className="truncate font-bold">
          {lead.valuationRequest.make} {lead.valuationRequest.model}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          Trade-in valuation - {formatMileage(lead.valuationRequest.mileage)}
        </p>
        {expanded && (
          <div className="text-muted-foreground grid gap-1 text-sm">
            <p>First registration {lead.valuationRequest.firstRegistration}</p>
            <p>
              Condition:{" "}
              {lead.valuationRequest.conditionDescription ?? "Not provided"}
            </p>
            <p>
              Accident history:{" "}
              {lead.valuationRequest.accidentHistory ?? "Not provided"}
            </p>
            <p>
              Service history:{" "}
              {lead.valuationRequest.serviceHistory ?? "Not provided"}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <p className="text-muted-foreground text-sm font-semibold">
      No vehicle linked
    </p>
  );
}

function EmptyLeadsState() {
  return (
    <div className="grid min-h-72 place-items-center p-8 text-center">
      <div className="max-w-sm">
        <span className="bg-secondary text-primary mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)]">
          <Inbox className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-extrabold">No leads found</h3>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          Change the selected status tab or search term to review more lead
          records.
        </p>
      </div>
    </div>
  );
}

function LeadPagination({
  query,
  result,
}: {
  query: LeadListQuery;
  result: AdminLeadListResult;
}) {
  return (
    <div className="bg-surface grid gap-3 rounded-[var(--radius-sm)] border p-3 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        Showing{" "}
        <strong className="text-foreground">{result.items.length}</strong> of{" "}
        <strong className="text-foreground">{result.total}</strong> leads
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex">
        {result.hasPreviousPage ? (
          <Button
            asChild
            variant="outline"
            className="rounded-[var(--radius-sm)]"
          >
            <Link href={buildAdminLeadListingHref(query, query.page - 1)}>
              Previous
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="rounded-[var(--radius-sm)]"
            disabled
          >
            Previous
          </Button>
        )}
        <span className="text-center text-sm font-bold">
          Page {result.page} of {Math.max(1, result.totalPages)}
        </span>
        {result.hasNextPage ? (
          <Button
            asChild
            variant="outline"
            className="rounded-[var(--radius-sm)]"
          >
            <Link href={buildAdminLeadListingHref(query, query.page + 1)}>
              Next
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="rounded-[var(--radius-sm)]"
            disabled
          >
            Next
          </Button>
        )}
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

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}
