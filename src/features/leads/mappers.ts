import type {
  AdminLeadActivityDto,
  AdminLeadDto,
  AdminLeadStatusCounts,
} from "./dto.ts";
import type { LeadSource, LeadStatus } from "./constants.ts";

type LeadRecord = {
  id: string;
  source: "callback" | "contact" | "test_drive" | "valuation";
  status: LeadStatus;
  priority: "high" | "low" | "medium" | "urgent";
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  message: string | null;
  preferredDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  assignedTo: {
    id: string;
    email: string;
    name: string;
  } | null;
  vehicle: {
    id: string;
    make: string;
    mileage: number;
    model: string;
    stockNumber: string;
    variant: string;
  } | null;
  valuationRequest: {
    accidentHistory: string | null;
    conditionDescription: string | null;
    firstRegistration: Date;
    make: string;
    mileage: number;
    model: string;
    serviceHistory: string | null;
  } | null;
  _count: {
    notes: number;
  };
};

type ActivityRecord = {
  id: string;
  occurredAt: Date;
  summary: string;
  targetId: string;
  targetLabel: string;
};

export function toAdminLeadDto(
  lead: LeadRecord,
  activityEvents: AdminLeadActivityDto[] = [],
): AdminLeadDto {
  return {
    id: lead.id,
    source: toDomainLeadSource(lead.source),
    status: lead.status,
    priority: lead.priority,
    customerName: lead.customerName,
    customerEmail: lead.customerEmail,
    customerPhone: lead.customerPhone,
    message: lead.message,
    preferredDate: lead.preferredDate?.toISOString() ?? null,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    assignedTo: lead.assignedTo ? { ...lead.assignedTo } : null,
    vehicle: lead.vehicle ? { ...lead.vehicle } : null,
    valuationRequest: lead.valuationRequest
      ? {
          ...lead.valuationRequest,
          firstRegistration: lead.valuationRequest.firstRegistration
            .toISOString()
            .slice(0, 7),
        }
      : null,
    noteCount: lead._count.notes,
    activityEvents: [...activityEvents],
  };
}

export function toAdminLeadActivityDto(
  event: ActivityRecord,
): AdminLeadActivityDto {
  return {
    id: event.id,
    occurredAt: event.occurredAt.toISOString(),
    summary: event.summary,
    targetLabel: event.targetLabel,
  };
}

export function buildAdminLeadStatusCounts(
  rows: Array<{ status: LeadStatus; _count: { _all: number } }>,
): AdminLeadStatusCounts {
  const counts: AdminLeadStatusCounts = {
    all: 0,
    closed: 0,
    contacted: 0,
    lost: 0,
    new: 0,
    qualified: 0,
  };

  for (const row of rows) {
    counts[row.status] = row._count._all;
    counts.all += row._count._all;
  }

  return counts;
}

function toDomainLeadSource(source: LeadRecord["source"]): LeadSource {
  return source === "test_drive" ? "test-drive" : source;
}
