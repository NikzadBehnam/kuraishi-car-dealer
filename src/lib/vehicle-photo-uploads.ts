import "server-only";

import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "node:crypto";
import { prisma } from "./db.ts";
import {
  getMediaStorageClient,
  getPrivateMediaBucket,
} from "./media-storage.ts";
import { requireSession } from "./session.ts";
import {
  detectPhotoMimeType,
  photoUploadIdSchema,
  photoUploadRequestSchema,
} from "./vehicle-photo-validation.ts";

const GRANT_SECONDS = 300;
const UPLOAD_LIFETIME_MS = 60 * 60 * 1000;
const SWEEP_GRACE_MS = 20 * 60 * 1000;
const stagingKey = (id: string) => `vehicle-photos/incoming/${id}`;
export const uploadedPhotoKey = (id: string) => `vehicle-photos/objects/${id}`;

export class VehiclePhotoError extends Error {
  readonly status: 404 | 409 | 410 | 422;

  constructor(status: VehiclePhotoError["status"], message: string) {
    super(message);
    this.name = "VehiclePhotoError";
    this.status = status;
  }
}

export function isMissingPhotoObject(error: unknown) {
  return (
    error instanceof S3ServiceException &&
    error.$metadata.httpStatusCode === 404
  );
}

async function deleteObject(key: string) {
  await getMediaStorageClient().send(
    new DeleteObjectCommand({ Bucket: getPrivateMediaBucket(), Key: key }),
  );
}

export async function sweepPhotoDeletions() {
  try {
    const queued = await prisma.vehiclePhotoDeletion.findMany({
      orderBy: { queuedAt: "asc" },
      take: 20,
    });
    for (const { objectKey } of queued) {
      try {
        await deleteObject(objectKey);
        await prisma.vehiclePhotoDeletion.deleteMany({ where: { objectKey } });
      } catch (error) {
        console.error("Vehicle photo deletion will be retried.", {
          errorType: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
  } catch (error) {
    console.error("Could not read the vehicle photo deletion queue.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

async function sweepExpiredUploads() {
  const expired = await prisma.vehiclePhotoUpload.findMany({
    where: { expiresAt: { lte: new Date(Date.now() - SWEEP_GRACE_MS) } },
    orderBy: { expiresAt: "asc" },
    take: 10,
  });
  for (const upload of expired) {
    try {
      await deleteObject(stagingKey(upload.id));
      const photo =
        upload.claimedAt &&
        (await prisma.vehiclePhoto.findUnique({
          where: { id: upload.id },
          select: { id: true },
        }));
      if (!photo) await deleteObject(uploadedPhotoKey(upload.id));
      await prisma.vehiclePhotoUpload.deleteMany({ where: { id: upload.id } });
    } catch (error) {
      console.error("Expired vehicle photo cleanup will be retried.", {
        errorType: error instanceof Error ? error.name : "UnknownError",
      });
    }
  }
}

export async function createPhotoUploads(input: unknown) {
  const { user } = await requireSession();
  const { files, vehicleId } = photoUploadRequestSchema.parse(input);
  if (
    vehicleId &&
    !(await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true },
    }))
  )
    throw new VehiclePhotoError(404, "Vehicle was not found.");

  await Promise.all([sweepExpiredUploads(), sweepPhotoDeletions()]);
  const expiresAt = new Date(Date.now() + UPLOAD_LIFETIME_MS);
  const uploads = await Promise.all(
    files.map(async ({ contentType, sizeBytes }) => {
      const uploadId = randomUUID();
      const key = stagingKey(uploadId);
      const post = await createPresignedPost(getMediaStorageClient(), {
        Bucket: getPrivateMediaBucket(),
        Key: key,
        Conditions: [
          ["content-length-range", sizeBytes, sizeBytes],
          ["eq", "$Content-Type", contentType],
        ],
        Fields: { "Content-Type": contentType },
        Expires: GRANT_SECONDS,
      });
      return {
        grant: { uploadId, ...post },
        row: {
          id: uploadId,
          vehicleId,
          uploadedById: user.id,
          mimeType: contentType,
          sizeBytes: BigInt(sizeBytes),
          expiresAt,
        },
      };
    }),
  );
  await prisma.vehiclePhotoUpload.createMany({
    data: uploads.map(({ row }) => row),
  });
  return { uploads: uploads.map(({ grant }) => grant) };
}

export async function completePhotoUpload(input: unknown) {
  const { user } = await requireSession();
  const { uploadId } = photoUploadIdSchema.parse(input);
  const upload = await prisma.vehiclePhotoUpload.findFirst({
    where: { id: uploadId, uploadedById: user.id },
  });
  if (!upload || upload.cancelledAt)
    throw new VehiclePhotoError(404, "Photo upload was not found.");
  if (upload.expiresAt <= new Date())
    throw new VehiclePhotoError(
      410,
      "Photo upload expired. Select the file again.",
    );
  if (upload.completedAt) return { id: upload.id };

  const client = getMediaStorageClient();
  const Bucket = getPrivateMediaBucket();
  const Key = stagingKey(upload.id);
  try {
    const head = await client.send(new HeadObjectCommand({ Bucket, Key }));
    if (
      !head.ETag ||
      head.ContentType !== upload.mimeType ||
      head.ContentLength !== Number(upload.sizeBytes)
    ) {
      throw new VehiclePhotoError(
        422,
        "Uploaded photo does not match the selected file.",
      );
    }
    const object = await client.send(
      new GetObjectCommand({
        Bucket,
        Key,
        Range: "bytes=0-7",
        IfMatch: head.ETag,
      }),
    );
    const prefix = await object.Body?.transformToByteArray();
    if (!prefix || detectPhotoMimeType(prefix) !== upload.mimeType) {
      throw new VehiclePhotoError(422, "The file must be a JPEG or PNG photo.");
    }
    await client.send(
      new CopyObjectCommand({
        Bucket,
        Key: uploadedPhotoKey(upload.id),
        CopySource: `/${encodeURIComponent(Bucket)}/${Key}`,
        CopySourceIfMatch: head.ETag,
        MetadataDirective: "REPLACE",
        ContentType: upload.mimeType,
      }),
    );
  } catch (error) {
    if (isMissingPhotoObject(error))
      throw new VehiclePhotoError(409, "Upload the photo before saving it.");
    if (
      error instanceof S3ServiceException &&
      error.$metadata.httpStatusCode === 412
    ) {
      throw new VehiclePhotoError(
        409,
        "The upload changed. Select the file again.",
      );
    }
    throw error;
  }
  const { count } = await prisma.vehiclePhotoUpload.updateMany({
    where: { id: upload.id, cancelledAt: null, expiresAt: { gt: new Date() } },
    data: { completedAt: new Date() },
  });
  if (!count)
    throw new VehiclePhotoError(409, "The photo upload is no longer active.");
  return { id: upload.id };
}

export async function cancelPhotoUpload(input: unknown) {
  const { user } = await requireSession();
  const { uploadId } = photoUploadIdSchema.parse(input);
  const { count } = await prisma.vehiclePhotoUpload.updateMany({
    where: { id: uploadId, uploadedById: user.id, claimedAt: null },
    data: { cancelledAt: new Date() },
  });
  if (!count) return;
  try {
    await Promise.all([
      deleteObject(stagingKey(uploadId)),
      deleteObject(uploadedPhotoKey(uploadId)),
    ]);
  } catch (error) {
    console.error("Cancelled vehicle photo cleanup will be retried.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  }
}
