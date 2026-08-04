"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type {
  AdminAppointment,
  AdminAppointmentStatus,
  AdminAppointmentType,
  AdminLead,
  AdminUser,
  AdminVehicle,
} from "@/types/admin";
import { adminRoutes } from "@/config/admin-routes.config";
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
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const appointmentTypeLabels: Record<AdminAppointmentType, string> = {
  test_drive: "Test drive",
  consultation: "Consultation",
  valuation: "Valuation",
  workshop: "Workshop",
  callback: "Callback",
};

const appointmentStatusLabels: Record<AdminAppointmentStatus, string> = {
  requested: "Requested",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
};

const typeIcons: Record<AdminAppointmentType, LucideIcon> = {
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

export function AppointmentsBoard({
  appointments,
  leads,
  users,
  vehicles,
}: {
  appointments: AdminAppointment[];
  leads: AdminLead[];
  users: AdminUser[];
  vehicles: AdminVehicle[];
}) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date("2026-08-06T10:00:00.000Z"),
  );
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);

  const selectedKey = selectedDate ? date.format(selectedDate) : "";
  const dailyAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => date.format(new Date(appointment.startsAt)) === selectedKey)
        .toSorted((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [appointments, selectedKey],
  );

  const sortedAppointments = useMemo(
    () =>
      [...appointments].toSorted((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [appointments],
  );
  const selectedAppointment =
    appointments.find((appointment) => appointment.id === selectedAppointmentId) ??
    null;

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <Card className="rounded-[var(--radius-sm)] p-4">
          <div>
            <h2 className="text-base font-extrabold">Calendar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a day to review agenda items.
            </p>
          </div>
          <div className="mt-4 overflow-hidden rounded-[var(--radius-sm)] border bg-background">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              defaultMonth={selectedDate}
              className="mx-auto"
            />
          </div>
        </Card>

        <Card className="rounded-[var(--radius-sm)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold">Daily agenda</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedDate
                  ? dayHeading.format(selectedDate)
                  : "No day selected"}
              </p>
            </div>
            <Button
              asChild
              variant="accent"
              className="rounded-[var(--radius-sm)]"
            >
              <Link href={adminRoutes.leads}>
                <CalendarPlus />
                From lead
              </Link>
            </Button>
          </div>

          <div className="mt-4 grid gap-3">
            {dailyAppointments.length ? (
              dailyAppointments.map((appointment) => (
                <AppointmentAgendaCard
                  key={appointment.id}
                  appointment={appointment}
                  vehicle={getVehicle(appointment, vehicles)}
                  assignedUser={getAssignedUser(appointment, users)}
                  onOpen={() => setSelectedAppointmentId(appointment.id)}
                />
              ))
            ) : (
              <EmptyState
                title="No appointments for this day"
                description="Pick another day or schedule an appointment from a lead."
              />
            )}
          </div>
        </Card>
      </section>

      <Card className="overflow-hidden rounded-[var(--radius-sm)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <div>
            <h2 className="text-base font-extrabold">All appointments</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Mock list view for requested, confirmed, completed, and cancelled
              work.
            </p>
          </div>
        </div>

        {sortedAppointments.length ? (
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
              {sortedAppointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell className="whitespace-nowrap px-3 text-xs font-bold text-muted-foreground">
                    {dateTime.format(new Date(appointment.startsAt))}
                  </TableCell>
                  <TableCell className="px-3">
                    <TypeBadge type={appointment.type} />
                  </TableCell>
                  <TableCell className="min-w-48 px-3">
                    <p className="font-extrabold">{appointment.customerName}</p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.customerEmail}
                    </p>
                  </TableCell>
                  <TableCell className="min-w-48 px-3">
                    <VehicleSummary vehicle={getVehicle(appointment, vehicles)} />
                  </TableCell>
                  <TableCell className="px-3">
                    <StatusBadge status={appointment.status} />
                  </TableCell>
                  <TableCell className="px-3 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-[var(--radius-sm)]"
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
            description="Appointment mock data will appear here once available."
          />
        )}
      </Card>

      <AppointmentDetailDialog
        appointment={selectedAppointment}
        lead={selectedAppointment ? getLead(selectedAppointment, leads) : undefined}
        vehicle={
          selectedAppointment ? getVehicle(selectedAppointment, vehicles) : undefined
        }
        assignedUser={
          selectedAppointment ? getAssignedUser(selectedAppointment, users) : undefined
        }
        open={!!selectedAppointment}
        onOpenChange={(open) => {
          if (!open) setSelectedAppointmentId(null);
        }}
      />
    </div>
  );
}

function AppointmentAgendaCard({
  appointment,
  vehicle,
  assignedUser,
  onOpen,
}: {
  appointment: AdminAppointment;
  vehicle?: AdminVehicle;
  assignedUser?: AdminUser;
  onOpen: () => void;
}) {
  const Icon = typeIcons[appointment.type];

  return (
    <article className="grid gap-3 rounded-[var(--radius-sm)] border bg-background p-3 md:grid-cols-[7rem_1fr_auto] md:items-center">
      <div>
        <p className="text-lg font-extrabold">
          {time.format(new Date(appointment.startsAt))}
        </p>
        <p className="text-xs font-bold text-muted-foreground">
          {time.format(new Date(appointment.endsAt))}
        </p>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <span className="grid size-10 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <TypeBadge type={appointment.type} />
            <StatusBadge status={appointment.status} />
          </div>
          <h3 className="mt-2 font-extrabold">{appointment.customerName}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicle
              ? `${vehicle.make} ${vehicle.model}`
              : appointment.location}
            {assignedUser ? ` - ${assignedUser.name}` : ""}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="rounded-[var(--radius-sm)]"
        onClick={onOpen}
      >
        Details
      </Button>
    </article>
  );
}

function AppointmentDetailDialog({
  appointment,
  lead,
  vehicle,
  assignedUser,
  open,
  onOpenChange,
}: {
  appointment: AdminAppointment | null;
  lead?: AdminLead;
  vehicle?: AdminVehicle;
  assignedUser?: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!appointment) return null;

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
          <section className="grid gap-3 rounded-[var(--radius-sm)] border bg-background p-4 sm:grid-cols-2">
            <Info label="Email" value={appointment.customerEmail} />
            <Info label="Phone" value={appointment.customerPhone ?? "Not provided"} />
            <Info label="Assigned to" value={assignedUser?.name ?? "Unassigned"} />
            <Info label="Lead" value={lead?.id ?? "No linked lead"} />
          </section>

          <section className="rounded-[var(--radius-sm)] border bg-background p-4">
            <h3 className="text-sm font-extrabold">Vehicle</h3>
            <Separator className="my-3" />
            <VehicleSummary vehicle={vehicle} expanded />
          </section>

          <section className="rounded-[var(--radius-sm)] border bg-background p-4">
            <h3 className="text-sm font-extrabold">Notes</h3>
            <Separator className="my-3" />
            <p className="text-sm leading-6 text-muted-foreground">
              {appointment.notes}
            </p>
          </section>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-[var(--radius-sm)]"
            onClick={() => toast.info("Cancel appointment is UI-only.")}
          >
            <XCircle />
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-[var(--radius-sm)]"
            onClick={() => toast.info("Reschedule is UI-only.")}
          >
            <Clock3 />
            Reschedule
          </Button>
          <Button
            type="button"
            variant="accent"
            className="rounded-[var(--radius-sm)]"
            onClick={() => toast.success("Confirm is UI-only.")}
          >
            <CheckCircle2 />
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VehicleSummary({
  vehicle,
  expanded = false,
}: {
  vehicle?: AdminVehicle;
  expanded?: boolean;
}) {
  if (!vehicle) {
    return (
      <p className="text-sm font-semibold text-muted-foreground">
        No vehicle linked
      </p>
    );
  }

  return (
    <div>
      <p className="font-extrabold">
        {vehicle.make} {vehicle.model}
      </p>
      <p className="text-xs text-muted-foreground">
        {vehicle.stockNumber} - {vehicle.variant}
      </p>
      {expanded && (
        <p className="mt-2 text-sm text-muted-foreground">
          {formatMileage(vehicle.mileage)} - {vehicle.location}
        </p>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: AdminAppointmentType }) {
  return (
    <Badge className="bg-secondary text-secondary-foreground dark:bg-secondary">
      {appointmentTypeLabels[type]}
    </Badge>
  );
}

function StatusBadge({ status }: { status: AdminAppointmentStatus }) {
  return (
    <Badge
      className={cn(
        "bg-secondary text-secondary-foreground dark:bg-secondary",
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
    <div className="grid min-h-48 place-items-center rounded-[var(--radius-sm)] border bg-background p-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-[var(--radius-sm)] bg-secondary text-primary">
          <CalendarClock className="size-6" aria-hidden="true" />
        </span>
        <h3 className="mt-4 font-extrabold">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
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

function getVehicle(
  appointment: AdminAppointment,
  vehicles: AdminVehicle[],
) {
  return appointment.vehicleId
    ? vehicles.find((vehicle) => vehicle.id === appointment.vehicleId)
    : undefined;
}

function getLead(appointment: AdminAppointment, leads: AdminLead[]) {
  return appointment.leadId
    ? leads.find((lead) => lead.id === appointment.leadId)
    : undefined;
}

function getAssignedUser(
  appointment: AdminAppointment,
  users: AdminUser[],
) {
  return users.find((user) => user.id === appointment.assignedToUserId);
}
