import type { PaginatedResult } from "../shared/pagination.ts";
import type { AppointmentStatus, AppointmentType } from "./constants.ts";

export type AdminAppointmentVehicleDto = {
  id: string;
  make: string;
  mileage: number;
  model: string;
  stockNumber: string;
  variant: string;
};

export type AdminAppointmentDto = {
  id: string;
  type: AppointmentType;
  status: AppointmentStatus;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  startsAt: string;
  endsAt: string;
  location: string;
  notes: string | null;
  cancellationReason: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  lead: {
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    vehicleId: string | null;
  } | null;
  vehicle: AdminAppointmentVehicleDto | null;
  assignedTo: {
    id: string;
    email: string;
    name: string;
  } | null;
};

export type AdminAppointmentFormOptionsDto = {
  leads: Array<{
    id: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    vehicleId: string | null;
  }>;
  users: Array<{ id: string; email: string; name: string }>;
  vehicles: Array<{
    id: string;
    make: string;
    model: string;
    stockNumber: string;
    variant: string;
  }>;
};

export type AdminAppointmentBoardResult = {
  agendaCandidates: AdminAppointmentDto[];
  appointments: PaginatedResult<AdminAppointmentDto>;
  options: AdminAppointmentFormOptionsDto;
};
