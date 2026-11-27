import "server-only";

import type { Prisma } from "../generated/prisma/client.ts";
import {
  uploadedPhotoKey,
  VehiclePhotoError,
} from "./vehicle-photo-uploads.ts";

type PhotoObject = { objectKey: string };

export async function queuePhotoDeletions(
  tx: Prisma.TransactionClient,
  photos: PhotoObject[],
) {
  if (photos.length) {
    await tx.vehiclePhotoDeletion.createMany({
      data: photos.map(({ objectKey }) => ({ objectKey })),
      skipDuplicates: true,
    });
  }
}

export async function saveVehiclePhotos(
  tx: Prisma.TransactionClient,
  vehicleId: string,
  ids: string[],
  uploadedById: string,
  creating: boolean,
) {
  const existing = creating
    ? []
    : await tx.vehiclePhoto.findMany({ where: { vehicleId } });
  const existingById = new Map(existing.map((photo) => [photo.id, photo]));
  const ordered: Prisma.VehiclePhotoCreateManyInput[] = [];

  for (const [position, id] of ids.entries()) {
    const saved = existingById.get(id);
    if (saved) {
      ordered.push({ ...saved, position });
      existingById.delete(id);
      continue;
    }

    const now = new Date();
    const where = {
      id,
      uploadedById,
      vehicleId: creating ? null : vehicleId,
      completedAt: { not: null },
      cancelledAt: null,
      claimedAt: null,
      expiresAt: { gt: now },
    };
    const { count } = await tx.vehiclePhotoUpload.updateMany({
      where,
      data: { claimedAt: now },
    });
    if (!count)
      throw new VehiclePhotoError(
        422,
        "A photo expired or is no longer available. Remove it and upload it again.",
      );
    const upload = await tx.vehiclePhotoUpload.findUniqueOrThrow({
      where: { id },
    });
    ordered.push({
      id,
      vehicleId,
      position,
      objectKey: uploadedPhotoKey(id),
      mimeType: upload.mimeType,
      sizeBytes: upload.sizeBytes,
    });
  }
  await queuePhotoDeletions(tx, [...existingById.values()]);
  if (existing.length)
    await tx.vehiclePhoto.deleteMany({ where: { vehicleId } });
  if (ordered.length) await tx.vehiclePhoto.createMany({ data: ordered });
}
