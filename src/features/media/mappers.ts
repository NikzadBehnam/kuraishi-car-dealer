import type { AdminMediaAssetDto } from "./dto.ts";

type AdminMediaAssetRecord = {
  id: string;
  provider: string;
  providerAssetId: string;
  url: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: bigint;
  width: number | null;
  height: number | null;
  title: string;
  altText: string | null;
  createdAt: Date;
  updatedAt: Date;
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
};

export function toAdminMediaAssetDto(
  asset: AdminMediaAssetRecord,
): AdminMediaAssetDto {
  return {
    id: asset.id,
    provider: asset.provider,
    providerAssetId: asset.providerAssetId,
    type: asset.mimeType.startsWith("image/") ? "image" : "document",
    usage: asset.vehicle ? "vehicle" : "unused",
    title: asset.title,
    originalFilename: asset.originalFilename,
    url: asset.url,
    altText: asset.altText?.trim() || asset.title,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes.toString(),
    width: asset.width,
    height: asset.height,
    vehicle: asset.vehicle ? { ...asset.vehicle } : null,
    uploadedBy: asset.uploadedBy ? { ...asset.uploadedBy } : null,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

export function buildDefaultMediaTitle(originalFilename: string) {
  const withoutExtension = originalFilename.replace(/\.[^.]+$/u, "");
  const normalized = withoutExtension.replace(/[-_]+/gu, " ").trim();

  return (normalized || "Untitled image").slice(0, 160);
}
