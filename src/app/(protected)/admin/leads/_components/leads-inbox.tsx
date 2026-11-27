"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { Inbox, Mail, Phone, Search } from "lucide-react";

import type {
  AdminInquiryDeliveryStatus,
  AdminInquiryDetail,
  AdminInquiryListItem,
  AdminInquiryNote,
} from "@/types/admin";
import type { InquiryNotificationErrorCode } from "@/lib/inquiry-notification-retry";
import {
  addAdminInquiryNoteAction,
  searchAdminInquiriesAction,
  updateAdminInquiryStatusAction,
} from "../actions";
import { formatMileage } from "@/lib/formatters";
import {
  buildAdminInquiriesHref,
  inquiryStatusSchema,
  MAX_ADMIN_INQUIRY_SEARCH_LENGTH,
} from "@/lib/admin-inquiry-validation";
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

type LeadStatus = AdminInquiryListItem["status"];

const leadStatuses = {
  new: "New",
  in_progress: "In progress",
  closed: "Closed",
} satisfies Record<LeadStatus, string>;

const statusColors = {
  new: "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200",
  in_progress:
    "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200",
  closed: "border-border bg-muted text-foreground",
} satisfies Record<LeadStatus, string>;

const selectClass =
  "border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 text-sm focus-visible:ring-2 disabled:opacity-50";

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
  leads: initialLeads,
  total: initialTotal,
  page: routePage,
  pageSize,
  totalPages: initialTotalPages,
  selectedInquiry,
  requestedLeadId,
}: {
  leads: AdminInquiryListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  selectedInquiry: AdminInquiryDetail | null;
  requestedLeadId: string | null;
}) {
  const router = useRouter();
  const searchInput = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [filtered, setFiltered] = useState<{
    search: string;
    status?: LeadStatus;
    leads: AdminInquiryListItem[];
    total: number;
    page: number;
    totalPages: number;
  } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchPending, startSearch] = useTransition();
  const { leads, total, page, totalPages } = filtered ?? {
    leads: initialLeads,
    total: initialTotal,
    page: routePage,
    totalPages: initialTotalPages,
  };
  const range =
    total === 0
      ? { start: 0, end: 0 }
      : {
          start: (page - 1) * pageSize + 1,
          end: Math.min(page * pageSize, total),
        };

  function openLead(leadId: string) {
    opener.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    router.push(buildAdminInquiriesHref(routePage, leadId));
  }

  function closeLead() {
    router.push(buildAdminInquiriesHref(routePage));
  }

  function searchLeads(query: string, status?: LeadStatus, nextPage = 1) {
    const search = query.trim();
    setSearchError(null);
    if (!search && !status) {
      setFiltered(null);
      if (routePage !== 1) {
        router.push(buildAdminInquiriesHref(1, requestedLeadId ?? undefined));
      }
      return;
    }
    startSearch(async () => {
      try {
        let result = await searchAdminInquiriesAction(
          search,
          String(nextPage),
          status,
        );
        if (result.ok && result.page > result.totalPages) {
          result = await searchAdminInquiriesAction(
            search,
            String(result.totalPages),
            status,
          );
        }
        if (!result.ok) {
          setSearchError(result.message);
          return;
        }
        setFiltered({ ...result, search, status });
      } catch {
        setSearchError("The search could not be completed. Please try again.");
      }
    });
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
            {total ? `${range.start}-${range.end} of ${total}` : "0 inquiries"}
          </p>
        </div>

        <form
          action={() => searchLeads(searchValue, filtered?.status)}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <div className="relative min-w-0 flex-[1_1_16rem]">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              ref={searchInput}
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              maxLength={MAX_ADMIN_INQUIRY_SEARCH_LENGTH}
              autoComplete="off"
              placeholder="Search customer, contact, vehicle, message"
              aria-label="Search leads"
              className="bg-background pl-9"
            />
          </div>
          <Button type="submit" variant="outline" disabled={searchPending}>
            {searchPending ? "Searching..." : "Search"}
          </Button>
          {(searchValue || filtered?.search) && (
            <Button
              type="button"
              variant="ghost"
              disabled={searchPending}
              onClick={() => {
                setSearchValue("");
                searchLeads("", filtered?.status);
              }}
            >
              Clear
            </Button>
          )}
          <label className="flex items-center gap-2 text-sm font-medium">
            Status filter
            <select
              className={selectClass}
              disabled={searchPending}
              value={filtered?.status ?? ""}
              onChange={(event) => {
                const status = inquiryStatusSchema.safeParse(
                  event.target.value,
                );
                searchLeads(filtered?.search ?? "", status.data);
              }}
            >
              <option value="">All</option>
              <StatusOptions />
            </select>
          </label>
        </form>
        {searchError && (
          <p role="alert" className="text-destructive text-sm">
            {searchError}
          </p>
        )}
      </Card>

      <Card
        aria-busy={searchPending}
        className="min-w-0 overflow-hidden rounded-[var(--radius-sm)]"
      >
        {leads.length ? (
          <>
            <div className="hidden xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="px-3">Customer</TableHead>
                    <TableHead className="px-3">Request</TableHead>
                    <TableHead className="px-3">Dates</TableHead>
                    <TableHead className="px-3">Status</TableHead>
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

            <div className="grid min-w-0 xl:hidden">
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
          <EmptyLeadsState hasFilters={Boolean(filtered)} />
        )}
      </Card>

      {totalPages > 1 && (
        <nav
          aria-label="Lead inbox pages"
          className="flex items-center justify-center gap-3"
        >
          {filtered ? (
            <Button
              variant="outline"
              size="sm"
              disabled={searchPending || page <= 1}
              onClick={() =>
                searchLeads(filtered.search, filtered.status, page - 1)
              }
            >
              Previous
            </Button>
          ) : page > 1 ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildAdminInquiriesHref(page - 1)}>Previous</Link>
            </Button>
          ) : (
            <Button disabled variant="outline" size="sm">
              Previous
            </Button>
          )}
          <span className="text-muted-foreground text-sm">
            Page {page} of {totalPages}
          </span>
          {filtered ? (
            <Button
              variant="outline"
              size="sm"
              disabled={searchPending || page >= totalPages}
              onClick={() =>
                searchLeads(filtered.search, filtered.status, page + 1)
              }
            >
              Next
            </Button>
          ) : page < totalPages ? (
            <Button asChild variant="outline" size="sm">
              <Link href={buildAdminInquiriesHref(page + 1)}>Next</Link>
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
        onStatusSaved={() => {
          if (filtered) searchLeads(filtered.search, filtered.status, page);
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          (opener.current?.isConnected
            ? opener.current
            : searchInput.current
          )?.focus();
        }}
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
      <TableCell className="px-3 [overflow-wrap:anywhere] whitespace-normal">
        <p className="font-extrabold">{lead.customerName}</p>
        <p className="text-muted-foreground text-xs">{lead.customerEmail}</p>
        {lead.customerPhone && (
          <p className="text-muted-foreground text-xs">{lead.customerPhone}</p>
        )}
      </TableCell>
      <TableCell className="px-3 [overflow-wrap:anywhere] whitespace-normal">
        <RequestSummary lead={lead} />
      </TableCell>
      <TableCell className="px-3">
        <LeadDates lead={lead} />
      </TableCell>
      <TableCell className="px-3">
        <StatusBadge status={lead.status} />
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
    <article className="grid min-w-0 gap-3 border-b p-4 [overflow-wrap:anywhere] last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={lead.status} />
      </div>
      <div>
        <h3 className="font-extrabold">{lead.customerName}</h3>
        <p className="text-muted-foreground text-sm">{lead.customerEmail}</p>
        {lead.customerPhone && (
          <p className="text-muted-foreground text-sm">{lead.customerPhone}</p>
        )}
      </div>
      <RequestSummary lead={lead} />
      <div className="flex items-center justify-between gap-3">
        <LeadDates lead={lead} />
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

function RequestSummary({ lead }: { lead: AdminInquiryListItem }) {
  return (
    <div className="grid gap-1 text-sm">
      <p className="font-semibold">{lead.requestedService}</p>
      {lead.serviceTopic && <p>{lead.serviceTopic}</p>}
      {(lead.vehicle || lead.vehicleTitleSnapshot) && (
        <LeadVehicleInterest lead={lead} />
      )}
    </div>
  );
}

function LeadDates({ lead }: { lead: AdminInquiryListItem }) {
  return (
    <div className="text-muted-foreground grid gap-1 text-xs">
      <p>
        Submitted{" "}
        <time dateTime={lead.createdAt}>{formatDateTime(lead.createdAt)}</time>
      </p>
      {lead.preferredDate && (
        <p>
          Preferred{" "}
          <time dateTime={lead.preferredDate}>
            {formatBusinessDate(lead.preferredDate)}
          </time>
        </p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge className={cn("border", statusColors[status])}>
      {leadStatuses[status]}
    </Badge>
  );
}

function StatusOptions() {
  return Object.entries(leadStatuses).map(([status, label]) => (
    <option value={status} key={status}>
      {label}
    </option>
  ));
}

function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  onStatusSaved,
  onCloseAutoFocus,
}: {
  lead: AdminInquiryDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusSaved: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        onCloseAutoFocus={onCloseAutoFocus}
        className="w-[min(44rem,calc(100vw-1rem))] overflow-hidden p-0"
      >
        <ScrollArea className="h-full">
          <div className="grid min-w-0 gap-5 p-4 pt-12 sm:p-5 sm:pr-12">
            <SheetHeader>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={lead.status} />
              </div>
              <SheetTitle className="[overflow-wrap:anywhere]">
                {lead.customerName}
              </SheetTitle>
              <SheetDescription>
                Submitted {formatDateTime(lead.createdAt)} from{" "}
                {sourceLabels[lead.source].toLowerCase()}.
              </SheetDescription>
            </SheetHeader>
            <LeadStatusForm lead={lead} onSaved={onStatusSaved} />

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
              </div>
            </DetailSection>

            <DetailSection title="Request">
              <div className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Appointment type" value={lead.requestedService} />
                {lead.serviceTopic && (
                  <Info label="Requested service" value={lead.serviceTopic} />
                )}
                <Info
                  label="Preferred date (not confirmed)"
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
                {lead.message.trim() ? lead.message : "No message provided."}
              </p>
            </DetailSection>

            <InquiryNotesSection lead={lead} />
            <details className="rounded border p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Email delivery details
              </summary>
              <div className="mt-3">
                <NotificationDeliverySection lead={lead} />
              </div>
            </details>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function LeadStatusForm({
  lead,
  onSaved,
}: {
  lead: AdminInquiryDetail;
  onSaved: () => void;
}) {
  const [selection, setSelection] = useState<LeadStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startSave] = useTransition();
  const value = selection ?? lead.status;

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || value === lead.status) return;
    setError(null);
    setSaved(false);
    startSave(async () => {
      try {
        const result = await updateAdminInquiryStatusAction({
          inquiryId: lead.id,
          status: value,
        });
        if (!result.ok) {
          setError(result.message);
          return;
        }
        setSelection(null);
        setSaved(true);
        onSaved();
      } catch {
        setError("The status could not be confirmed. Refresh before retrying.");
      }
    });
  }

  return (
    <form onSubmit={save} className="grid gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm font-medium">
          Inquiry status
          <select
            className={selectClass}
            value={value}
            disabled={pending}
            onChange={(event) => {
              const status = inquiryStatusSchema.parse(event.target.value);
              setSelection(status);
              setSaved(false);
              setError(null);
            }}
          >
            <StatusOptions />
          </select>
        </label>
        <Button type="submit" disabled={pending || value === lead.status}>
          {pending ? "Saving status..." : "Save status"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm">
          Status saved.
        </p>
      )}
    </form>
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
      <p className="mt-1 font-semibold [overflow-wrap:anywhere]">{value}</p>
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
        <p className="font-bold [overflow-wrap:anywhere]">
          {lead.vehicle.make} {lead.vehicle.model}
          {lead.vehicle.variant ? ` ${lead.vehicle.variant}` : ""}
        </p>
        {expanded && (
          <p className="text-muted-foreground text-xs [overflow-wrap:anywhere]">
            {lead.vehicle.stockNumber} -{" "}
            {lead.vehicle.location ?? "Location unavailable"}
          </p>
        )}
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
        <p className="font-bold [overflow-wrap:anywhere]">
          {lead.vehicleTitleSnapshot}
        </p>
        {expanded && (
          <p className="text-muted-foreground text-xs [overflow-wrap:anywhere]">
            Historical vehicle reference
            {lead.vehicleSlugSnapshot ? `: ${lead.vehicleSlugSnapshot}` : ""}
          </p>
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

function EmptyLeadsState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="grid min-h-72 place-items-center p-8 text-center">
      <div className="max-w-sm">
        <span className="bg-secondary text-primary mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)]">
          <Inbox className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-extrabold">
          {hasFilters ? "No inquiries match" : "No inquiries yet"}
        </h3>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {hasFilters
            ? "Try another search term or change the status filter."
            : "Accepted inquiries will appear here."}
        </p>
      </div>
    </div>
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
