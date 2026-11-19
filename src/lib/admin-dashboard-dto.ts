import type { InquirySource } from "../generated/prisma/enums.ts";
import type { AdminDashboardInquiry } from "../types/admin.ts";
import { serializeAdminInquirySource } from "./admin-inquiry-dto.ts";

export interface AdminDashboardInquiryQueryRow {
  id: string;
  source: InquirySource;
  customerName: string;
  customerEmail: string;
  createdAt: Date;
  vehicleTitleSnapshot: string | null;
  vehicle: {
    make: string;
    model: string;
    variant: string | null;
  } | null;
}

export function serializeAdminDashboardInquiry(
  row: AdminDashboardInquiryQueryRow,
): AdminDashboardInquiry {
  const liveVehicleTitle = row.vehicle
    ? `${row.vehicle.make} ${row.vehicle.model}${row.vehicle.variant ? ` ${row.vehicle.variant}` : ""}`
    : null;
  return {
    id: row.id,
    source: serializeAdminInquirySource(row.source),
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    createdAt: row.createdAt.toISOString(),
    vehicleInterest: liveVehicleTitle ?? row.vehicleTitleSnapshot,
  };
}
