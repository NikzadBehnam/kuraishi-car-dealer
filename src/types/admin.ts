import type { Vehicle } from "@/types/vehicle";

export type AdminVehicleStatus =
  "draft" | "published" | "reserved" | "sold" | "archived";

export type AdminInspectionStatus =
  "pending" | "in_progress" | "passed" | "failed";

export interface AdminVehicle extends Vehicle {
  stockNumber: string;
  status: AdminVehicleStatus;
  inspectionStatus: AdminInspectionStatus;
  acquisitionDate: string;
  publishedAt?: string;
  reservedUntil?: string;
  soldAt?: string;
  lastUpdatedAt: string;
  updatedByUserId: string;
  vinLastSix: string;
  ownerCount: number;
  views: number;
  inquiries: number;
  favourites: number;
  marginEstimate: number;
}

export type AdminLeadSource =
  "contact" | "valuation" | "test-drive" | "callback";

export type AdminLeadStatus =
  "new" | "contacted" | "qualified" | "closed" | "lost";

export type AdminLeadPriority = "low" | "medium" | "high" | "urgent";

export interface AdminLead {
  id: string;
  source: AdminLeadSource;
  status: AdminLeadStatus;
  priority: AdminLeadPriority;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  vehicleId?: string;
  assignedToUserId?: string;
  createdAt: string;
  updatedAt: string;
  preferredDate?: string;
  message: string;
  notesCount: number;
  valuationVehicle?: {
    make: string;
    model: string;
    firstRegistration: string;
    mileage: number;
  };
}

export type AdminAppointmentType =
  "test_drive" | "consultation" | "valuation" | "workshop" | "callback";

export type AdminAppointmentStatus =
  "requested" | "confirmed" | "completed" | "cancelled";

export interface AdminAppointment {
  id: string;
  type: AdminAppointmentType;
  status: AdminAppointmentStatus;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  vehicleId?: string;
  leadId?: string;
  assignedToUserId: string;
  startsAt: string;
  endsAt: string;
  location: string;
  notes: string;
}

export type AdminUserRole = "client" | "admin" | "staff";
export type AdminUserStatus = "active" | "suspended" | "invited";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: AdminUserRole;
  status: AdminUserStatus;
  registeredAt: string;
  lastLoginAt?: string;
  favouritesVehicleIds: string[];
  comparisonVehicleIds: string[];
  inquiryIds: string[];
  valuationLeadIds: string[];
  totalSessions: number;
  notes?: string;
}

export type AdminActivityType =
  "login" | "favourite" | "comparison" | "inquiry" | "valuation" | "update";

export type AdminActivitySeverity = "info" | "success" | "warning" | "risk";

export interface AdminActivityEvent {
  id: string;
  type: AdminActivityType;
  severity: AdminActivitySeverity;
  actorUserId?: string;
  actorName: string;
  actorRole: AdminUserRole;
  targetType: "vehicle" | "lead" | "appointment" | "user" | "media";
  targetId: string;
  targetLabel: string;
  occurredAt: string;
  summary: string;
  metadata: Record<string, string | number | boolean>;
}

export type AdminMediaType = "image" | "document" | "brand";
export type AdminMediaUsage = "vehicle" | "brand" | "legal" | "unused";

export interface AdminMediaAsset {
  id: string;
  type: AdminMediaType;
  usage: AdminMediaUsage;
  title: string;
  filename: string;
  url: string;
  alt: string;
  sizeKb: number;
  width?: number;
  height?: number;
  usedByVehicleId?: string;
  uploadedByUserId: string;
  uploadedAt: string;
}

export interface AdminStat {
  id: string;
  label: string;
  value: string;
  helper: string;
  trend: "up" | "down" | "flat";
  delta: string;
}
