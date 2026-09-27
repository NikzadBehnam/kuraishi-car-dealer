import type { AdminMediaType, AdminMediaUsage } from "./constants.ts";

export type AdminMediaAssetDto = {
  id: string;
  provider: string;
  providerAssetId: string;
  type: AdminMediaType;
  usage: AdminMediaUsage;
  title: string;
  originalFilename: string;
  url: string;
  altText: string;
  mimeType: string;
  sizeBytes: string;
  width: number | null;
  height: number | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    variant: string;
    stockNumber: string;
  } | null;
  uploadedBy: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type DeleteMediaAssetsResult = {
  deletedCount: number;
  ids: string[];
};
