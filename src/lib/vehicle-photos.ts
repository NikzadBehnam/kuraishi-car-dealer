import "server-only";

import { GetObjectCommand } from "@aws-sdk/client-s3";
import { AuthorizationError } from "./auth-access.ts";
import { prisma } from "./db.ts";
import { getPublicVehicleWhere } from "./inventory-eligibility.ts";
import { inventoryIdSchema } from "./inventory-validation.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
} from "./media-storage.ts";
import { requireSession } from "./session.ts";
import { isMissingPhotoObject } from "./vehicle-photo-uploads.ts";
import {
  PHOTO_MIME_TYPES,
  publicPhotoUrl,
  staffPhotoUrl,
} from "./vehicle-photo-validation.ts";
import type { PublicVehicleCardImageDTO } from "../types/inventory.ts";

const noCache = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function serveVehiclePhoto(
  input: unknown,
  scope: "staff" | "public",
) {
  try {
    if (scope === "staff") await requireSession();
    const id = inventoryIdSchema.safeParse(input);
    if (!id.success)
      return new Response(null, { status: 404, headers: noCache });
    const photo = await prisma.vehiclePhoto.findFirst({
      where: {
        id: id.data,
        ...(scope === "public" && { vehicle: getPublicVehicleWhere("detail") }),
      },
      select: { objectKey: true, mimeType: true, sizeBytes: true },
    });
    if (!photo) return new Response(null, { status: 404, headers: noCache });
    const mimeType = PHOTO_MIME_TYPES.find((type) => type === photo.mimeType);
    if (!mimeType)
      throw new Error("Stored photo has an unsupported content type.");
    const object = await getMediaStorageClient().send(
      new GetObjectCommand({
        Bucket: getPrivateMediaBucket(),
        Key: photo.objectKey,
      }),
    );
    if (
      !object.Body ||
      object.ContentType !== mimeType ||
      object.ContentLength !== Number(photo.sizeBytes)
    ) {
      throw new Error("Stored photo metadata does not match the photo record.");
    }
    return new Response(object.Body.transformToWebStream(), {
      headers: {
        ...noCache,
        "Content-Type": mimeType,
        "Content-Length": photo.sizeBytes.toString(),
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError)
      return new Response(null, { status: error.status, headers: noCache });
    const missing = isMissingPhotoObject(error);
    console.error("Could not read a stored vehicle photo.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return new Response(null, {
      status: missing ? 404 : 503,
      headers: noCache,
    });
  }
}

export async function listStaffVehiclePhotos(vehicleId: string) {
  await requireSession();
  const photos = await prisma.vehiclePhoto.findMany({
    where: { vehicleId },
    orderBy: { position: "asc" },
    select: { id: true, altText: true },
  });
  return photos.map((photo) => ({
    ...photo,
    previewUrl: staffPhotoUrl(photo.id),
  }));
}

export async function listPublicVehiclePhotos(vehicleId: string) {
  const photos = await prisma.vehiclePhoto.findMany({
    where: { vehicleId, vehicle: getPublicVehicleWhere("detail") },
    orderBy: { position: "asc" },
    select: { id: true, altText: true },
  });
  return photos.map((photo) => ({
    ...photo,
    previewUrl: publicPhotoUrl(photo.id),
  }));
}

export async function listPublicVehicleCardImages(vehicleIds: string[]) {
  const images = new Map<string, PublicVehicleCardImageDTO[]>();
  if (!vehicleIds.length) return images;
  const photos = await prisma.vehiclePhoto.findMany({
    where: {
      vehicleId: { in: vehicleIds },
      vehicle: getPublicVehicleWhere("catalog"),
    },
    orderBy: [{ vehicleId: "asc" }, { position: "asc" }],
    select: { id: true, altText: true, vehicleId: true },
  });
  for (const { id, altText, vehicleId } of photos) {
    const gallery = images.get(vehicleId) ?? [];
    gallery.push({ id, altText, url: publicPhotoUrl(id) });
    images.set(vehicleId, gallery);
  }
  return images;
}
