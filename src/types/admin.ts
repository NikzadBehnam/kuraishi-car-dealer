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
  vinLastSix: string;
  ownerCount: number;
  views: number;
  inquiries: number;
  marginEstimate: number;
}

export type AdminLeadSource =
  "contact" | "test-drive" | "callback";

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
  uploadedAt: string;
}
