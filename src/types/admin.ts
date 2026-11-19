import type { Vehicle } from "@/types/vehicle";
import type { InquiryNotificationErrorCode } from "@/lib/inquiry-notification-retry";

export type AdminVehicleStatus =
  "draft" | "published" | "reserved" | "sold" | "archived";

export type AdminInspectionStatus =
  "pending" | "in_progress" | "passed" | "failed";

export interface AdminVehicle extends Vehicle {
  mediaAssetIds?: string[];
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
  views: number;
  inquiries: number;
  marginEstimate: number;
}

export type AdminLeadSource = "contact" | "test-drive" | "callback";

export interface AdminLead {
  id: string;
  source: AdminLeadSource;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  vehicleId?: string;
  createdAt: string;
  updatedAt: string;
  appointmentType?: string;
  preferredDate?: string;
  message: string;
  notesCount: number;
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
}

export interface AdminInquiryDetail extends AdminInquiryListItem {
  message: string;
  preferredDate: string | null;
  updatedAt: string;
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

export type AdminMediaType = "image" | "document" | "brand";
export type AdminMediaUsage = "vehicle" | "brand" | "legal" | "unused";

export interface AdminMediaAsset {
  id: string;
  type: AdminMediaType;
  usage: AdminMediaUsage;
  bucketAccess: "private" | "public_read";
  publicApprovedAt: string | null;
  title: string;
  filename: string;
  url: string;
  alt: string;
  sizeKb: number;
  width?: number;
  height?: number;
  usedByVehicleId?: string;
  usedByVehicle?: Pick<Vehicle, "id" | "make" | "model">;
  uploadedAt: string;
}

export interface AdminMediaLibraryPage {
  assets: AdminMediaAsset[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}
