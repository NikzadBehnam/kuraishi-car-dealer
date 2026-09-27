import type { PaginatedResult } from "../shared/pagination.ts";
import type { LeadPriority, LeadSource, LeadStatus } from "./constants.ts";

export type AdminLeadVehicleDto = {
  id: string;
  make: string;
  mileage: number;
  model: string;
  stockNumber: string;
  variant: string;
};

export type AdminLeadValuationDto = {
  accidentHistory: string | null;
  conditionDescription: string | null;
  firstRegistration: string;
  make: string;
  mileage: number;
  model: string;
  serviceHistory: string | null;
};

export type AdminLeadActivityDto = {
  id: string;
  occurredAt: string;
  summary: string;
  targetLabel: string;
};

export type AdminLeadDto = {
  id: string;
  source: LeadSource;
  status: LeadStatus;
  priority: LeadPriority;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  message: string | null;
  preferredDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: {
    id: string;
    email: string;
    name: string;
  } | null;
  vehicle: AdminLeadVehicleDto | null;
  valuationRequest: AdminLeadValuationDto | null;
  noteCount: number;
  activityEvents: AdminLeadActivityDto[];
};

export type AdminLeadStatusCounts = Record<"all" | LeadStatus, number>;

export type AdminLeadListResult = PaginatedResult<AdminLeadDto> & {
  statusCounts: AdminLeadStatusCounts;
};
