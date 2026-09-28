"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CarFront,
  CheckCircle2,
  Clock3,
  Phone,
  RotateCcw,
  Search,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { adminRoutes } from "@/config/admin-routes.config";
import {
  buildAdminAppointmentBoardHref,
  createAdminAppointmentBoardSearchParams,
  type AdminAppointmentBoardQuery,
} from "@/features/appointments/admin-board-search-params";
import type {
  AppointmentStatus,
  AppointmentType,
} from "@/features/appointments/constants";
import type {
  AdminAppointmentBoardResult,
  AdminAppointmentDto,
  AdminAppointmentFormOptionsDto,
  AdminAppointmentVehicleDto,
} from "@/features/appointments/dto";
import { formatMileage } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";

import {
  createAppointmentAction,
  rescheduleAppointmentAction,
  transitionAppointmentStatusAction,
} from "../actions";

const appointmentTypeLabels: Record<AppointmentType, string> = {
  test_drive: "Test drive",
  consultation: "Consultation",
  valuation: "Valuation",
  workshop: "Workshop",
  callback: "Callback",
};

const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const typeIcons: Record<AppointmentType, LucideIcon> = {
  test_drive: CarFront,
  consultation: CalendarCheck,
  valuation: CalendarClock,
  workshop: RotateCcw,
  callback: Phone,
};

const date = new Intl.DateTimeFormat("en-CA");
const dayHeading = new Intl.DateTimeFormat("en-GB", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const time = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});
const dateTime = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

type AppointmentFormState = {
  assignedToUserId: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  endsAt: string;
  leadId: string;
  location: string;
  notes: string;
  startsAt: string;
  type: AppointmentType;
  vehicleId: string;
};

export function AppointmentsBoard({
  boardQuery,
  initialLeadId,
  result,
}: {
  boardQuery: AdminAppointmentBoardQuery;
  initialLeadId?: string;
  result: AdminAppointmentBoardResult;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(
    boardQuery.appointments.search ?? "",
  );
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [createOpen, setCreateOpen] = useState(!!initialLeadId);
  const [rescheduleAppointment, setRescheduleAppointment] =
    useState<AdminAppointmentDto | null>(null);
  const [cancelAppointment, setCancelAppointment] =
    useState<AdminAppointmentDto | null>(null);
  const selectedDate = new Date(`${boardQuery.selectedDate}T12:00:00`);
  const selectedKey = date.format(selectedDate);
  const appointments = result.appointments.items;
  const allVisibleAppointments = useMemo(
    () =>
      Array.from(
        new Map(
          [...appointments, ...result.agendaCandidates].map((appointment) => [
            appointment.id,
            appointment,
          ]),
        ).values(),
      ),
    [appointments, result.agendaCandidates],
  );
  const dailyAppointments = result.agendaCandidates.filter(
    (appointment) =>
      date.format(new Date(appointment.startsAt)) === selectedKey,
  );
  const selectedAppointment =
    allVisibleAppointments.find(
      (appointment) => appointment.id === selectedAppointmentId,
    ) ?? null;

  const navigate = (params: URLSearchParams) => {
    startTransition(() =>
      router.push(`${adminRoutes.appointments}?${params.toString()}`),
    );
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = createAdminAppointmentBoardSearchParams(boardQuery);
    const search = searchValue.trim();
    if (search) params.set("search", search);
    else params.delete("search");
    params.delete("page");
    navigate(params);
  };

  const updateFilter = (key: "status" | "type", value: string) => {
    const params = createAdminAppointmentBoardSearchParams(boardQuery);
    if (value === "all") params.delete(key);
    else params.set(key, value);
    params.delete("page");
    navigate(params);
  };

  return (
    <div className={cn("grid min-w-0 gap-4", isPending && "opacity-70")}>
      <section className="grid gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
          <h2 className="text-base font-extrabold">Calendar</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Pick a day to review agenda items.
          </p>
          <div className="bg-background mt-4 overflow-hidden rounded-[var(--radius-sm)] border">
            <Calendar
              mode="single"
              selected={selectedDate}
              defaultMonth={selectedDate}
              onSelect={(nextDate) => {
                if (!nextDate) return;
                const params =
                  createAdminAppointmentBoardSearchParams(boardQuery);
                params.set("date", date.format(nextDate));
                params.delete("page");
                navigate(params);
              }}
              className="mx-auto"
            />
          </div>
        </Card>

        <Card className="min-w-0 rounded-[var(--radius-sm)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold">Daily agenda</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {dayHeading.format(selectedDate)}
              </p>
            </div>
            <Button
              type="button"
              variant="accent"
              className="w-full rounded-[var(--radius-sm)] sm:w-auto"
              onClick={() => setCreateOpen(true)}
            >
              <CalendarPlus />
              Schedule appointment
            </Button>
          </div>
          <div className="mt-4 grid gap-3">
            {dailyAppointments.length ? (
              dailyAppointments.map((appointment) => (
                <AppointmentAgendaCard
                  key={appointment.id}
                  appointment={appointment}
                  onOpen={() => setSelectedAppointmentId(appointment.id)}
                />
              ))
            ) : (
              <EmptyState
                title="No appointments for this day"
                description="Pick another day or schedule an appointment."
              />
            )}
          </div>
        </Card>
      </section>

      <Card className="min-w-0 overflow-hidden rounded-[var(--radius-sm)]">
        <div className="grid gap-3 border-b p-4">
          <div>
            <h2 className="text-base font-extrabold">All appointments</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Search and manage appointments from the scheduling database.
            </p>
          </div>
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem]">
            <form className="flex min-w-0 gap-2" onSubmit={submitSearch}>
              <div className="relative min-w-0 flex-1">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="Search customer, location, or vehicle"
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="outline" disabled={isPending}>
                Search
              </Button>
            </form>
            <FilterSelect
              label="status"
              value={boardQuery.appointments.status ?? "all"}
              items={appointmentStatusLabels}
              onChange={(value) => updateFilter("status", value)}
            />
            <FilterSelect
              label="type"
              value={boardQuery.appointments.type ?? "all"}
              items={appointmentTypeLabels}
              onChange={(value) => updateFilter("type", value)}
            />
          </div>
        </div>

        {appointments.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="px-3">Time</TableHead>
                <TableHead className="px-3">Type</TableHead>
                <TableHead className="px-3">Customer</TableHead>
                <TableHead className="px-3">Vehicle</TableHead>
                <TableHead className="px-3">Status</TableHead>
                <TableHead className="px-3 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="text-muted-foreground px-3 text-xs font-bold whitespace-nowrap">
                    {dateTime.format(new Date(appointment.startsAt))}
                  </TableCell>
                  <TableCell className="px-3">
                    <TypeBadge type={appointment.type} />
                  </TableCell>
                  <TableCell className="min-w-48 px-3">
                    <p className="font-extrabold">{appointment.customerName}</p>
                    <p className="text-muted-foreground text-xs">
                      {appointment.customerEmail}
                    </p>
                  </TableCell>
                  <TableCell className="min-w-48 px-3">
                    <VehicleSummary vehicle={appointment.vehicle} />
                  </TableCell>
                  <TableCell className="px-3">
                    <StatusBadge status={appointment.status} />
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedAppointmentId(appointment.id)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState
            title="No appointments"
            description="Adjust the filters or schedule a new appointment."
          />
        )}
        <Pagination boardQuery={boardQuery} result={result} />
      </Card>

      <AppointmentDetailDialog
        appointment={selectedAppointment}
        pending={isPending}
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointmentId(null)}
        onReschedule={setRescheduleAppointment}
        onCancel={setCancelAppointment}
        onTransition={(appointment, status) => {
          startTransition(async () => {
            const response = await transitionAppointmentStatusAction({
              id: appointment.id,
              status,
            });
            if (!response.ok) {
              toast.error(response.error.message);
              return;
            }
            setSelectedAppointmentId(null);
            toast.success(
              `Appointment marked ${appointmentStatusLabels[status].toLowerCase()}.`,
            );
            router.refresh();
          });
        }}
      />
      <AppointmentFormDialog
        key={
          createOpen ? `create-open-${initialLeadId ?? "new"}` : "create-closed"
        }
        initialLeadId={initialLeadId}
        open={createOpen}
        options={result.options}
        selectedDate={boardQuery.selectedDate}
        pending={isPending}
        onOpenChange={setCreateOpen}
        onSubmit={(values) => {
          startTransition(async () => {
            const response = await createAppointmentAction(
              toAppointmentDraft(values),
            );
            if (!response.ok) {
              toast.error(response.error.message);
              return;
            }
            setCreateOpen(false);
            toast.success("Appointment scheduled.");
            router.refresh();
          });
        }}
      />
      <RescheduleDialog
        key={`reschedule-${rescheduleAppointment?.id ?? "closed"}`}
        appointment={rescheduleAppointment}
        pending={isPending}
        onOpenChange={(open) => !open && setRescheduleAppointment(null)}
        onSubmit={(startsAt, endsAt) => {
          if (!rescheduleAppointment) return;
          startTransition(async () => {
            const response = await rescheduleAppointmentAction({
              id: rescheduleAppointment.id,
              startsAt: toIsoDateTime(startsAt),
              endsAt: toIsoDateTime(endsAt),
            });
            if (!response.ok) {
              toast.error(response.error.message);
              return;
            }
            setRescheduleAppointment(null);
            setSelectedAppointmentId(null);
            toast.success("Appointment rescheduled.");
            router.refresh();
          });
        }}
      />
      <CancelDialog
        key={`cancel-${cancelAppointment?.id ?? "closed"}`}
        appointment={cancelAppointment}
        pending={isPending}
        onOpenChange={(open) => !open && setCancelAppointment(null)}
        onSubmit={(reason) => {
          if (!cancelAppointment) return;
          startTransition(async () => {
            const response = await transitionAppointmentStatusAction({
              cancellationReason: reason,
              id: cancelAppointment.id,
              status: "cancelled",
            });
            if (!response.ok) {
              toast.error(response.error.message);
              return;
            }
            setCancelAppointment(null);
            setSelectedAppointmentId(null);
            toast.success("Appointment cancelled.");
            router.refresh();
          });
        }}
      />
    </div>
  );
}

function AppointmentAgendaCard({
  appointment,
  onOpen,
}: {
  appointment: AdminAppointmentDto;
  onOpen: () => void;
}) {
  const Icon = typeIcons[appointment.type];
  return (
    <article className="bg-background grid min-w-0 gap-3 rounded-[var(--radius-sm)] border p-3 md:grid-cols-[7rem_minmax(0,1fr)_auto] md:items-center">
      <div>
        <p className="text-lg font-extrabold">
          {time.format(new Date(appointment.startsAt))}
        </p>
        <p className="text-muted-foreground text-xs font-bold">
          {time.format(new Date(appointment.endsAt))}
        </p>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <span className="bg-secondary text-primary grid size-10 place-items-center rounded-[var(--radius-sm)]">
          <Icon className="size-5" />
        </span>
        <div>
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={appointment.type} />
            <StatusBadge status={appointment.status} />
          </div>
          <h3 className="mt-2 font-extrabold">{appointment.customerName}</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {appointment.vehicle
              ? `${appointment.vehicle.make} ${appointment.vehicle.model}`
              : appointment.location}
            {appointment.assignedTo ? ` - ${appointment.assignedTo.name}` : ""}
          </p>
        </div>
      </div>
      <Button type="button" variant="outline" onClick={onOpen}>
        Details
      </Button>
    </article>
  );
}

function AppointmentDetailDialog({
  appointment,
  open,
  pending,
  onCancel,
  onOpenChange,
  onReschedule,
  onTransition,
}: {
  appointment: AdminAppointmentDto | null;
  open: boolean;
  pending: boolean;
  onCancel: (appointment: AdminAppointmentDto) => void;
  onOpenChange: (open: boolean) => void;
  onReschedule: (appointment: AdminAppointmentDto) => void;
  onTransition: (
    appointment: AdminAppointmentDto,
    status: AppointmentStatus,
  ) => void;
}) {
  if (!appointment) return null;
  const active =
    appointment.status === "requested" || appointment.status === "confirmed";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={appointment.type} />
            <StatusBadge status={appointment.status} />
          </div>
          <DialogTitle>{appointment.customerName}</DialogTitle>
          <DialogDescription>
            {dateTime.format(new Date(appointment.startsAt))} -{" "}
            {appointment.location}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <section className="grid gap-3 rounded-[var(--radius-sm)] border p-4 sm:grid-cols-2">
            <Info label="Email" value={appointment.customerEmail} />
            <Info
              label="Phone"
              value={appointment.customerPhone ?? "Not provided"}
            />
            <Info
              label="Assigned to"
              value={appointment.assignedTo?.name ?? "Unassigned"}
            />
            <Info
              label="Lead"
              value={appointment.lead?.id ?? "No linked lead"}
            />
          </section>
          <section className="rounded-[var(--radius-sm)] border p-4">
            <h3 className="text-sm font-extrabold">Vehicle</h3>
            <Separator className="my-3" />
            <VehicleSummary vehicle={appointment.vehicle} expanded />
          </section>
          <section className="rounded-[var(--radius-sm)] border p-4">
            <h3 className="text-sm font-extrabold">Notes</h3>
            <Separator className="my-3" />
            <p className="text-muted-foreground text-sm">
              {appointment.notes ?? "No notes provided."}
            </p>
            {appointment.cancellationReason && (
              <p className="text-destructive mt-2 text-sm">
                Cancellation: {appointment.cancellationReason}
              </p>
            )}
          </section>
        </div>
        <DialogFooter className="[&>button]:w-full sm:[&>button]:w-auto">
          <Button
            type="button"
            variant="outline"
            disabled={pending || !active}
            onClick={() => onCancel(appointment)}
          >
            <XCircle />
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !active}
            onClick={() => onReschedule(appointment)}
          >
            <Clock3 />
            Reschedule
          </Button>
          {appointment.status === "requested" && (
            <Button
              type="button"
              variant="accent"
              disabled={pending}
              onClick={() => onTransition(appointment, "confirmed")}
            >
              <CheckCircle2 />
              Confirm
            </Button>
          )}
          {appointment.status === "confirmed" && (
            <Button
              type="button"
              variant="accent"
              disabled={pending}
              onClick={() => onTransition(appointment, "completed")}
            >
              <CheckCircle2 />
              Complete
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AppointmentFormDialog({
  initialLeadId,
  onOpenChange,
  onSubmit,
  open,
  options,
  pending,
  selectedDate,
}: {
  initialLeadId?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: AppointmentFormState) => void;
  open: boolean;
  options: AdminAppointmentFormOptionsDto;
  pending: boolean;
  selectedDate: string;
}) {
  const [values, setValues] = useState(() =>
    createInitialForm(options, initialLeadId, selectedDate),
  );
  const set = (field: keyof AppointmentFormState, value: string) =>
    setValues((current) => ({ ...current, [field]: value }));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule appointment</DialogTitle>
          <DialogDescription>
            Create a requested appointment and optionally link it to a lead or
            vehicle.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(values);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="Lead"
              value={values.leadId || "none"}
              onChange={(value) => {
                const lead = options.leads.find((item) => item.id === value);
                setValues((current) => ({
                  ...current,
                  leadId: value === "none" ? "" : value,
                  customerName: lead?.customerName ?? current.customerName,
                  customerEmail: lead?.customerEmail ?? current.customerEmail,
                  customerPhone: lead?.customerPhone ?? current.customerPhone,
                  vehicleId: lead?.vehicleId ?? current.vehicleId,
                }));
              }}
              items={[
                { value: "none", label: "No linked lead" },
                ...options.leads.map((lead) => ({
                  value: lead.id,
                  label: `${lead.customerName} — ${lead.customerEmail}`,
                })),
              ]}
            />
            <SelectField
              label="Type"
              value={values.type}
              onChange={(value) => set("type", value)}
              items={Object.entries(appointmentTypeLabels).map(
                ([value, label]) => ({ value, label }),
              )}
            />
            <FormField label="Customer name">
              <input
                required
                className="control"
                value={values.customerName}
                onChange={(e) => set("customerName", e.target.value)}
              />
            </FormField>
            <FormField label="Email">
              <input
                required
                type="email"
                className="control"
                value={values.customerEmail}
                onChange={(e) => set("customerEmail", e.target.value)}
              />
            </FormField>
            <FormField label="Phone">
              <input
                type="tel"
                className="control"
                value={values.customerPhone}
                onChange={(e) => set("customerPhone", e.target.value)}
              />
            </FormField>
            <FormField label="Location">
              <input
                required
                className="control"
                value={values.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </FormField>
            <FormField label="Starts">
              <input
                required
                type="datetime-local"
                className="control"
                value={values.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
              />
            </FormField>
            <FormField label="Ends">
              <input
                required
                type="datetime-local"
                className="control"
                value={values.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
              />
            </FormField>
            <SelectField
              label="Vehicle"
              value={values.vehicleId || "none"}
              onChange={(value) =>
                set("vehicleId", value === "none" ? "" : value)
              }
              items={[
                { value: "none", label: "No linked vehicle" },
                ...options.vehicles.map((vehicle) => ({
                  value: vehicle.id,
                  label: `${vehicle.make} ${vehicle.model} — ${vehicle.stockNumber}`,
                })),
              ]}
            />
            <SelectField
              label="Assigned to"
              value={values.assignedToUserId || "none"}
              onChange={(value) =>
                set("assignedToUserId", value === "none" ? "" : value)
              }
              items={[
                { value: "none", label: "Unassigned" },
                ...options.users.map((user) => ({
                  value: user.id,
                  label: user.name,
                })),
              ]}
            />
          </div>
          <FormField label="Notes">
            <Textarea
              rows={3}
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              <CalendarPlus />
              Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RescheduleDialog({
  appointment,
  onOpenChange,
  onSubmit,
  pending,
}: {
  appointment: AdminAppointmentDto | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (startsAt: string, endsAt: string) => void;
  pending: boolean;
}) {
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const key = appointment?.id ?? "closed";
  return (
    <Dialog key={key} open={!!appointment} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            Choose a new appointment window.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(
              startsAt || toLocalDateTime(appointment!.startsAt),
              endsAt || toLocalDateTime(appointment!.endsAt),
            );
          }}
        >
          <FormField label="Starts">
            <input
              required
              type="datetime-local"
              className="control"
              value={
                startsAt ||
                (appointment ? toLocalDateTime(appointment.startsAt) : "")
              }
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </FormField>
          <FormField label="Ends">
            <input
              required
              type="datetime-local"
              className="control"
              value={
                endsAt ||
                (appointment ? toLocalDateTime(appointment.endsAt) : "")
              }
              onChange={(e) => setEndsAt(e.target.value)}
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({
  appointment,
  onOpenChange,
  onSubmit,
  pending,
}: {
  appointment: AdminAppointmentDto | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
  pending: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={!!appointment} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel appointment</DialogTitle>
          <DialogDescription>
            Record why this appointment is being cancelled.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(reason);
          }}
        >
          <FormField label="Cancellation reason">
            <Textarea
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Keep appointment
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={pending || reason.trim().length < 2}
            >
              <XCircle />
              Cancel appointment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Pagination({
  boardQuery,
  result,
}: {
  boardQuery: AdminAppointmentBoardQuery;
  result: AdminAppointmentBoardResult;
}) {
  const page = result.appointments;
  return (
    <div className="grid gap-3 border-t p-3 sm:flex sm:items-center sm:justify-between">
      <p className="text-muted-foreground text-sm">
        Showing <strong>{page.items.length}</strong> of{" "}
        <strong>{page.total}</strong> appointments
      </p>
      <div className="flex items-center gap-2">
        {page.hasPreviousPage ? (
          <Button asChild variant="outline">
            <Link
              href={buildAdminAppointmentBoardHref(boardQuery, page.page - 1)}
            >
              Previous
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Previous
          </Button>
        )}
        <span className="text-sm font-bold">
          Page {page.page} of {Math.max(1, page.totalPages)}
        </span>
        {page.hasNextPage ? (
          <Button asChild variant="outline">
            <Link
              href={buildAdminAppointmentBoardHref(boardQuery, page.page + 1)}
            >
              Next
            </Link>
          </Button>
        ) : (
          <Button variant="outline" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={`Filter by ${label}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">
          All {label === "status" ? "statuses" : "types"}
        </SelectItem>
        {Object.entries(items).map(([itemValue, itemLabel]) => (
          <SelectItem key={itemValue} value={itemValue}>
            {itemLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SelectField({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <FormField label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function VehicleSummary({
  vehicle,
  expanded = false,
}: {
  vehicle: AdminAppointmentVehicleDto | null;
  expanded?: boolean;
}) {
  if (!vehicle)
    return (
      <p className="text-muted-foreground text-sm font-semibold">
        No vehicle linked
      </p>
    );
  return (
    <div>
      <p className="font-extrabold">
        {vehicle.make} {vehicle.model}
      </p>
      <p className="text-muted-foreground text-xs">
        {vehicle.stockNumber} - {vehicle.variant}
      </p>
      {expanded && (
        <p className="text-muted-foreground mt-2 text-sm">
          {formatMileage(vehicle.mileage)}
        </p>
      )}
    </div>
  );
}
function TypeBadge({ type }: { type: AppointmentType }) {
  return (
    <Badge className="bg-secondary text-secondary-foreground">
      {appointmentTypeLabels[type]}
    </Badge>
  );
}
function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground",
        status === "requested" && "bg-accent/10 text-accent",
        status === "confirmed" && "bg-success/10 text-success",
        status === "completed" && "bg-info/10 text-info",
        status === "cancelled" && "bg-destructive/10 text-destructive",
      )}
    >
      {appointmentStatusLabels[status]}
    </Badge>
  );
}
function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="grid min-h-48 place-items-center p-6 text-center">
      <div>
        <CalendarClock className="mx-auto size-8" />
        <h3 className="mt-4 font-extrabold">{title}</h3>
        <p className="text-muted-foreground mt-2 text-sm">{description}</p>
      </div>
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

function createInitialForm(
  options: AdminAppointmentFormOptionsDto,
  leadId: string | undefined,
  selectedDate: string,
): AppointmentFormState {
  const lead = options.leads.find((item) => item.id === leadId);
  return {
    assignedToUserId: "",
    customerEmail: lead?.customerEmail ?? "",
    customerName: lead?.customerName ?? "",
    customerPhone: lead?.customerPhone ?? "",
    endsAt: `${selectedDate}T10:45`,
    leadId: lead?.id ?? "",
    location: "Showroom",
    notes: "",
    startsAt: `${selectedDate}T10:00`,
    type: "consultation",
    vehicleId: lead?.vehicleId ?? "",
  };
}

function toAppointmentDraft(values: AppointmentFormState) {
  return {
    ...values,
    assignedToUserId: values.assignedToUserId || undefined,
    customerPhone: values.customerPhone || undefined,
    endsAt: toIsoDateTime(values.endsAt),
    leadId: values.leadId || undefined,
    notes: values.notes || undefined,
    startsAt: toIsoDateTime(values.startsAt),
    vehicleId: values.vehicleId || undefined,
  };
}
function toIsoDateTime(value: string) {
  return new Date(value).toISOString();
}
function toLocalDateTime(value: string) {
  const input = new Date(value);
  const local = new Date(input.getTime() - input.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
