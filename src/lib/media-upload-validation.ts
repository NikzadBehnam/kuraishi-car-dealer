import { z } from "zod";

export const MAX_MEDIA_FILES_PER_REQUEST = 5;
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;
export const MEDIA_UPLOAD_URL_TTL_SECONDS = 300;
export const MEDIA_UPLOAD_INTENT_TTL_SECONDS = 900;

const mimeTypes = ["image/jpeg", "image/png", "application/pdf"] as const;
const mediaTypes = ["image", "document", "brand"] as const;

const mediaUploadFileSchema = z
  .strictObject({
    originalFilename: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine((value) => value !== "." && value !== "..")
      .refine((value) => !/[\/\\\u0000-\u001f\u007f]/u.test(value), {
        message:
          "Filenames cannot contain path separators or control characters.",
      }),
    contentType: z.enum(mimeTypes),
    sizeBytes: z.number().int().positive(),
    type: z.enum(mediaTypes),
    title: z.string().trim().min(1).max(255).optional(),
    altText: z.string().max(1000).optional(),
  })
  .superRefine((file, context) => {
    const extension = file.originalFilename.split(".").pop()?.toLowerCase();
    const isImage =
      file.contentType === "image/jpeg" || file.contentType === "image/png";
    const allowedExtensions =
      file.contentType === "image/jpeg"
        ? ["jpg", "jpeg"]
        : file.contentType === "image/png"
          ? ["png"]
          : ["pdf"];
    const maxSize =
      file.contentType === "application/pdf"
        ? MAX_PDF_SIZE_BYTES
        : MAX_IMAGE_SIZE_BYTES;

    if (!extension || !allowedExtensions.includes(extension)) {
      context.addIssue({
        code: "custom",
        message: "The filename extension must match the selected file type.",
        path: ["originalFilename"],
      });
    }

    if (file.sizeBytes > maxSize) {
      context.addIssue({
        code: "custom",
        message: `Files cannot exceed ${maxSize / (1024 * 1024)} MiB.`,
        path: ["sizeBytes"],
      });
    }

    if (
      (isImage && file.type === "document") ||
      (!isImage && file.type !== "document")
    ) {
      context.addIssue({
        code: "custom",
        message: "The media category must match the selected file type.",
        path: ["type"],
      });
    }
  });

export const mediaUploadBatchSchema = z.strictObject({
  files: z.array(mediaUploadFileSchema).min(1).max(MAX_MEDIA_FILES_PER_REQUEST),
});

export const completeMediaUploadSchema = z.strictObject({
  uploadId: z.string().uuid(),
});

export type MediaUploadFileInput = z.infer<typeof mediaUploadFileSchema>;

export function detectMediaMimeType(prefix: Uint8Array): string | null {
  if (
    prefix.length >= 3 &&
    prefix[0] === 0xff &&
    prefix[1] === 0xd8 &&
    prefix[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    prefix.length >= 8 &&
    prefix[0] === 0x89 &&
    prefix[1] === 0x50 &&
    prefix[2] === 0x4e &&
    prefix[3] === 0x47 &&
    prefix[4] === 0x0d &&
    prefix[5] === 0x0a &&
    prefix[6] === 0x1a &&
    prefix[7] === 0x0a
  ) {
    return "image/png";
  }

  const pdfHeader = Buffer.from(prefix.subarray(0, 1024)).indexOf("%PDF-");
  return pdfHeader >= 0 ? "application/pdf" : null;
}

export function getMediaExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "application/pdf":
      return "pdf";
    default:
      throw new Error("Unsupported verified media type.");
  }
}
