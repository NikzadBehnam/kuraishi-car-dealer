"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Inbox, Mail, Phone, Search } from "lucide-react";

import type {
  AdminInquiryDeliveryStatus,
  AdminInquiryDetail,
  AdminInquiryListItem,
  AdminInquiryNote,
} from "@/types/admin";
import type { InquiryNotificationErrorCode } from "@/lib/inquiry-notification-retry";
import { addAdminInquiryNoteAction } from "../actions";
import { adminRoutes } from "@/config/admin-routes.config";
import { formatMileage } from "@/lib/formatters";
import { buildAdminInquiriesHref } from "@/lib/admin-inquiry-validation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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

const sourceLabels = {
  contact: "Contact",
  "test-drive": "Test drive",
  callback: "Callback",
} as const;

const deliveryLabels: Record<AdminInquiryDeliveryStatus, string> = {
  disabled: "Disabled",
  pending: "Queued",
  sending: "Sending",
  retry: "Retry pending",
  sent: "Provider accepted",
  failed: "Failed",
  untracked: "Not tracked",
};

const deliveryErrorMessages: Record<InquiryNotificationErrorCode, string> = {
  provider_rejected: "The provider rejected the notification.",
  provider_unavailable: "The provider could not complete delivery.",
  provider_response_invalid: "The provider returned an invalid response.",
  configuration_invalid: "Notification configuration is invalid.",
  invalid_notification: "The notification content could not be prepared.",
  attempts_exhausted: "The maximum retry attempts were reached.",
};

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
});
const businessDate = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export function LeadsInbox({
  leads,
  total,
  page,
  pageSize,
  totalPages,
  search,
  selectedInquiry,
  requestedLeadId,
}: {
  leads: AdminInquiryListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
  selectedInquiry: AdminInquiryDetail | null;
  requestedLeadId: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const range =
    total === 0
      ? { start: 0, end: 0 }
      : {
          start: (page - 1) * pageSize + 1,
          end: Math.min(page * pageSize, total),
        };

  function openLead(leadId: string) {
    const params = new URLSearchParams(searchParamsString);
    params.set("lead", leadId);
    router.push(`${pathname}?${params.toString()}`);
  }

  function closeLead() {
    const params = new URLSearchParams(searchParamsString);
    params.delete("lead");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div className="grid min-w-0 gap-4">
      <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-extrabold">Leads inbox</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Review contact and vehicle inquiry requests.
            </p>
          </div>
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {range.start}-{range.end} of {total}
          </p>
        </div>

        <form
          action={pathname}
          method="get"
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <div className="relative min-w-56 flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              name="q"
              defaultValue={search}
              maxLength={100}
              placeholder="Search customer, contact, vehicle, message"
              aria-label="Search leads"
              className="bg-background pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
          {search && (
            <Button asChild variant="ghost">
              <Link href={adminRoutes.leads}>Clear</Link>
            </Button>
          )}
        </form>
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
                    <TableHead className="px-3">Email delivery</TableHead>
                    <TableHead className="px-3">Notes</TableHead>
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
                      onOpen={() => openLead(lead.id)}
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
                  onOpen={() => openLead(lead.id)}
                />
              ))}
            </div>
          </>
        ) : (
          <EmptyLeadsState hasSearch={Boolean(search)} />
        )}
      </Card>

      {totalPages > 1 && (
        <nav
          aria-label="Lead inbox pages"
          className="flex items-center justify-center gap-3"
        >
          {page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildAdminInquiriesHref(search, page - 1)}>
                Previous
              </Link>
            </Button>
          ) : (
            <Button disabled variant="outline" size="sm">
              Previous
            </Button>
          )}
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildAdminInquiriesHref(search, page + 1)}>Next</Link>
            </Button>
          ) : (
            <Button disabled variant="outline" size="sm">
              Next
            </Button>
          )}
        </nav>
      )}

      {requestedLeadId && !selectedInquiry && (
        <div role="alert" className="rounded border p-4 text-sm">
          <p>This inquiry could not be found.</p>
          <Button
            type="button"
            variant="link"
            className="px-0"
            onClick={closeLead}
          >
            Return to the inbox
          </Button>
        </div>
      )}
      <LeadDetailSheet
        key={selectedInquiry?.id}
        lead={selectedInquiry}
        open={Boolean(requestedLeadId && selectedInquiry)}
        onOpenChange={(open) => {
          if (!open) closeLead();
        }}
      />
    </div>
  );
}

function LeadTableRow({
  lead,
  onOpen,
}: {
  lead: AdminInquiryListItem;
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
        <DeliveryBadge status={lead.deliveryStatus} />
      </TableCell>
      <TableCell className="px-3 text-sm">
        {lead.notesCount} {lead.notesCount === 1 ? "note" : "notes"}
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
  lead: AdminInquiryListItem;
  onOpen: () => void;
}) {
  return (
    <article className="grid gap-3 border-b p-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={lead.source} />
        <DeliveryBadge status={lead.deliveryStatus} />
      </div>
      <div>
        <h3 className="font-extrabold">{lead.customerName}</h3>
        <p className="text-muted-foreground text-sm">{lead.customerEmail}</p>
        {lead.customerPhone && (
          <p className="text-muted-foreground text-sm">{lead.customerPhone}</p>
        )}
      </div>
      <LeadVehicleInterest lead={lead} />
      <p className="text-muted-foreground text-xs">
        {lead.notesCount}{" "}
        {lead.notesCount === 1 ? "internal note" : "internal notes"}
      </p>
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
  lead: AdminInquiryDetail | null;
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
                <DeliveryBadge status={lead.deliveryStatus} />
              </div>
              <SheetTitle>{lead.customerName}</SheetTitle>
              <SheetDescription>
                Created {formatDateTime(lead.createdAt)} from{" "}
                {sourceLabels[lead.source].toLowerCase()}.
              </SheetDescription>
            </SheetHeader>

            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              {lead.customerPhone ? (
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-[var(--radius-sm)]"
                >
                  <a href={`tel:${lead.customerPhone.replace(/[^\d+]/g, "")}`}>
                    <Phone />
                    Call
                  </a>
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled
                  variant="outline"
                  className="w-full rounded-[var(--radius-sm)]"
                >
                  <Phone />
                  No phone provided
                </Button>
              )}
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
                <Info label="Inquiry reference" value={lead.id} />
                <Info label="Name" value={lead.customerName} />
                <Info label="Email" value={lead.customerEmail} />
                <Info
                  label="Phone"
                  value={lead.customerPhone ?? "Not provided"}
                />
                <Info label="Created" value={formatDateTime(lead.createdAt)} />
                <Info label="Updated" value={formatDateTime(lead.updatedAt)} />
              </div>
            </DetailSection>

            <DetailSection title="Request">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Request type" value={lead.requestedService} />
                <Info
                  label="Preferred date"
                  value={
                    lead.preferredDate
                      ? formatBusinessDate(lead.preferredDate)
                      : "Not provided"
                  }
                />
              </div>
            </DetailSection>

            <DetailSection title="Vehicle interest">
              <LeadVehicleInterest lead={lead} expanded />
            </DetailSection>

            <DetailSection title="Message">
              <p className="text-muted-foreground text-sm leading-6 break-words whitespace-pre-wrap">
                {lead.message}
              </p>
            </DetailSection>

            <NotificationDeliverySection lead={lead} />
            <InquiryNotesSection lead={lead} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function InquiryNotesSection({ lead }: { lead: AdminInquiryDetail }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        const result = await addAdminInquiryNoteAction({
          inquiryId: lead.id,
          content,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setContent("");
        setFeedback("Note saved.");
        router.refresh();
      } catch {
        setError(
          "The save could not be confirmed. Refresh the inbox before retrying.",
        );
      }
    });
  }

  return (
    <DetailSection title={`Internal notes (${lead.notesCount})`}>
      <div className="grid gap-4">
        <p className="text-muted-foreground text-sm">
          Saved notes are kept as an authored history and cannot be edited here.
        </p>
        {lead.notes.length ? (
          <ol className="grid gap-3">
            {lead.notes.map((note) => (
              <li key={note.id}>
                <InquiryNoteEntry note={note} />
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted-foreground text-sm">
            No internal notes yet.
          </p>
        )}
        <form onSubmit={saveNote} className="grid gap-3">
          <label htmlFor={`lead-note-${lead.id}`} className="text-sm font-bold">
            Add an internal note
          </label>
          <Textarea
            id={`lead-note-${lead.id}`}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={2000}
            rows={4}
            disabled={isPending}
            aria-describedby={`lead-note-help-${lead.id}`}
          />
          <p
            id={`lead-note-help-${lead.id}`}
            className="text-muted-foreground text-xs"
          >
            Up to 2,000 characters. Visible only to signed-in staff.
          </p>
          {error && (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          )}
          {feedback && (
            <p role="status" className="text-sm">
              {feedback}
            </p>
          )}
          <Button
            type="submit"
            disabled={isPending || !content.trim()}
            className="w-full rounded-[var(--radius-sm)] sm:w-fit"
          >
            {isPending ? "Saving..." : "Add note"}
          </Button>
        </form>
      </div>
    </DetailSection>
  );
}

function InquiryNoteEntry({ note }: { note: AdminInquiryNote }) {
  return (
    <article className="bg-muted/40 grid gap-2 rounded-[var(--radius-sm)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold">{note.authorName}</p>
        <time
          className="text-muted-foreground text-xs"
          dateTime={note.createdAt}
        >
          {formatDateTime(note.createdAt)}
        </time>
      </div>
      <p className="text-sm leading-6 break-words whitespace-pre-wrap">
        {note.content}
      </p>
    </article>
  );
}

function NotificationDeliverySection({ lead }: { lead: AdminInquiryDetail }) {
  const delivery = lead.delivery;
  return (
    <DetailSection title="Email notification">
      {!delivery ? (
        <p className="text-muted-foreground text-sm">
          Delivery state was not recorded for this inquiry.
        </p>
      ) : (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-xs font-bold">Status</p>
            <div className="mt-1">
              <DeliveryBadge status={delivery.status} />
            </div>
          </div>
          <Info label="Attempts" value={String(delivery.attemptCount)} />
          {delivery.status === "sent" && delivery.sentAt && (
            <p className="text-muted-foreground text-sm sm:col-span-2">
              The provider accepted the request at{" "}
              {formatDateTime(delivery.sentAt)}. Inbox delivery is not
              confirmed.
            </p>
          )}
          {delivery.status === "retry" && (
            <>
              <Info
                label="Next retry"
                value={formatDateTime(delivery.nextAttemptAt)}
              />
              <p className="text-muted-foreground text-sm sm:col-span-2">
                A retry is pending. Automatic worker scheduling is not
                configured.
              </p>
            </>
          )}
          {delivery.status === "failed" && (
            <p role="status" className="text-destructive text-sm sm:col-span-2">
              {delivery.lastErrorCode
                ? deliveryErrorMessages[delivery.lastErrorCode]
                : "Notification delivery failed."}
            </p>
          )}
        </div>
      )}
    </DetailSection>
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
  lead: AdminInquiryListItem;
  expanded?: boolean;
}) {
  if (lead.vehicle) {
    return (
      <div className={cn("min-w-0", expanded && "grid gap-2")}>
        <p className="truncate font-bold">
          {lead.vehicle.make} {lead.vehicle.model}
          {lead.vehicle.variant ? ` ${lead.vehicle.variant}` : ""}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {lead.vehicle.stockNumber} -{" "}
          {lead.vehicle.location ?? "Location unavailable"}
        </p>
        {expanded && (
          <p className="text-muted-foreground text-sm">
            {lead.vehicle.mileage === null
              ? "Mileage unavailable"
              : formatMileage(lead.vehicle.mileage)}
          </p>
        )}
      </div>
    );
  }
  if (lead.vehicleTitleSnapshot) {
    return (
      <div className={cn("min-w-0", expanded && "grid gap-2")}>
        <p className="truncate font-bold">{lead.vehicleTitleSnapshot}</p>
        <p className="text-muted-foreground truncate text-xs">
          Historical vehicle reference
          {lead.vehicleSlugSnapshot ? `: ${lead.vehicleSlugSnapshot}` : ""}
        </p>
      </div>
    );
  }
  return (
    <p className="text-muted-foreground text-sm font-semibold">
      No vehicle linked
    </p>
  );
}

function EmptyLeadsState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="grid min-h-72 place-items-center p-8 text-center">
      <div className="max-w-sm">
        <span className="bg-secondary text-primary mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)]">
          <Inbox className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-extrabold">
          {hasSearch ? "No inquiries match" : "No inquiries yet"}
        </h3>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {hasSearch
            ? "Try another search term or clear the search."
            : "Accepted inquiries will appear here."}
        </p>
      </div>
    </div>
  );
}

function SourceBadge({ source }: { source: AdminInquiryListItem["source"] }) {
  return (
    <Badge className="bg-secondary text-secondary-foreground dark:bg-secondary">
      {sourceLabels[source]}
    </Badge>
  );
}

function DeliveryBadge({ status }: { status: AdminInquiryDeliveryStatus }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
        status === "failed" && "bg-destructive text-destructive-foreground",
      )}
    >
      {deliveryLabels[status]}
    </Badge>
  );
}

function formatDateTime(value: string) {
  return dateTime.format(new Date(value));
}

function formatBusinessDate(value: string) {
  return businessDate.format(new Date(`${value}T00:00:00.000Z`));
}
