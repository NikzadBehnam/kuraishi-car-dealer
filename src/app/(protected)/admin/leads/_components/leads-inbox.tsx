"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Inbox, Mail, Phone, Search } from "lucide-react";

import type {
  AdminLead,
  AdminLeadSource,
  AdminVehicle,
} from "@/types/admin";
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
import { Textarea } from "@/components/ui/textarea";

const sourceLabels: Record<AdminLeadSource, string> = {
  contact: "Contact",
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
}: {
  leads: AdminLead[];
  vehicles: AdminVehicle[];
}) {
  const [query, setQuery] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const filteredLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("de");

    return leads
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
        ]
          .join(" ")
          .toLocaleLowerCase("de")
          .includes(normalizedQuery);
      })
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [leads, query, vehicles]);

  const selectedLead =
    leads.find((lead) => lead.id === selectedLeadId) ?? null;

  return (
    <div className="grid min-w-0 gap-4">
      <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Leads inbox</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review and manage contact and vehicle inquiry requests.
            </p>
          </div>
        </div>

        <div className="mt-4">
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
        <LeadVehicleInterest vehicle={vehicle} />
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
      </div>
      <div>
        <h3 className="font-extrabold">{lead.customerName}</h3>
        <p className="text-sm text-muted-foreground">{lead.customerEmail}</p>
        {lead.customerPhone && (
          <p className="text-sm text-muted-foreground">{lead.customerPhone}</p>
        )}
      </div>
      <LeadVehicleInterest vehicle={vehicle} />
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
  open,
  onOpenChange,
}: {
  lead: AdminLead | null;
  vehicle?: AdminVehicle;
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
            </div>

            <DetailSection title="Customer">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Name" value={lead.customerName} />
                <Info label="Email" value={lead.customerEmail} />
                <Info label="Phone" value={lead.customerPhone ?? "Not provided"} />
              </div>
            </DetailSection>

            <DetailSection title="Request">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info
                  label="Request type"
                  value={lead.appointmentType ?? sourceLabels[lead.source]}
                />
                <Info
                  label="Preferred date"
                  value={
                    lead.preferredDate
                      ? formatDateTime(lead.preferredDate)
                      : "Not provided"
                  }
                />
              </div>
            </DetailSection>

            <DetailSection title="Vehicle interest">
              <LeadVehicleInterest vehicle={vehicle} expanded />
            </DetailSection>

            <DetailSection title="Message">
              <p className="text-sm leading-6 text-muted-foreground">
                {lead.message}
              </p>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function LeadVehicleInterest({
  vehicle,
  expanded = false,
}: {
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
          Change the search term to review more mocked lead records.
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

function getLeadVehicle(lead: AdminLead, vehicles: AdminVehicle[]) {
  return lead.vehicleId
    ? vehicles.find((vehicle) => vehicle.id === lead.vehicleId)
    : undefined;
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}
