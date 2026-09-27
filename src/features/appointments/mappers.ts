import type { AdminAppointmentDto } from "./dto.ts";

type AppointmentRecord = {
  id: string;
  type: AdminAppointmentDto["type"];
  status: AdminAppointmentDto["status"];
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  startsAt: Date;
  endsAt: Date;
  location: string;
  notes: string | null;
  cancellationReason: string | null;
  confirmedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  lead: AdminAppointmentDto["lead"];
  vehicle: AdminAppointmentDto["vehicle"];
  assignedTo: AdminAppointmentDto["assignedTo"];
};

export function toAdminAppointmentDto(
  appointment: AppointmentRecord,
): AdminAppointmentDto {
  return {
    id: appointment.id,
    type: appointment.type,
    status: appointment.status,
    customerName: appointment.customerName,
    customerEmail: appointment.customerEmail,
    customerPhone: appointment.customerPhone,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    location: appointment.location,
    notes: appointment.notes,
    cancellationReason: appointment.cancellationReason,
    confirmedAt: appointment.confirmedAt?.toISOString() ?? null,
    completedAt: appointment.completedAt?.toISOString() ?? null,
    cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
    lead: appointment.lead ? { ...appointment.lead } : null,
    vehicle: appointment.vehicle ? { ...appointment.vehicle } : null,
    assignedTo: appointment.assignedTo ? { ...appointment.assignedTo } : null,
  };
}
