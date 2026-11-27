import type { Vehicle } from "@/types/vehicle";
import type { InquiryNotificationErrorCode } from "@/lib/inquiry-notification-retry";

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
  vinLastSix: string;
  ownerCount: number;
  marginEstimate: number;
}

export type AdminLeadSource = "contact" | "test-drive" | "callback";

export interface AdminDashboardInquiry {
  id: string;
  source: AdminLeadSource;
  customerName: string;
  customerEmail: string;
  createdAt: string;
  vehicleInterest: string | null;
}

export interface AdminDashboardMetrics {
  inventoryTotal: number;
  statusCounts: Record<AdminVehicleStatus, number>;
  leadCount: number;
  soldCount: number;
  vehicleInquiryCount: number;
  recentInquiries: AdminDashboardInquiry[];
}

export type AdminInquiryDeliveryStatus =
  | "disabled"
  | "pending"
  | "sending"
  | "retry"
  | "sent"
  | "failed"
  | "untracked";

export interface AdminInquiryVehicle {
  id: string;
  make: string;
  model: string;
  variant: string | null;
  stockNumber: string;
  mileage: number | null;
  location: string | null;
}

export interface AdminInquiryListItem {
  id: string;
  source: AdminLeadSource;
  requestedService: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  vehicleId: string | null;
  vehicleTitleSnapshot: string | null;
  vehicleSlugSnapshot: string | null;
  vehicle: AdminInquiryVehicle | null;
  createdAt: string;
  deliveryStatus: AdminInquiryDeliveryStatus;
  notesCount: number;
}

export interface AdminInquiryNote {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface AdminInquiryDetail extends AdminInquiryListItem {
  serviceTopic: string | null;
  message: string;
  preferredDate: string | null;
  updatedAt: string;
  notes: AdminInquiryNote[];
  delivery: {
    status: Exclude<AdminInquiryDeliveryStatus, "untracked">;
    attemptCount: number;
    lastErrorCode: InquiryNotificationErrorCode | null;
    nextAttemptAt: string;
    sentAt: string | null;
  } | null;
}

export interface AdminInquiryPage {
  items: AdminInquiryListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  search: string;
}
