export const adminMediaTypes = ["image", "document"] as const;
export const adminMediaUsages = ["vehicle", "unused"] as const;

export type AdminMediaType = (typeof adminMediaTypes)[number];
export type AdminMediaUsage = (typeof adminMediaUsages)[number];

export const mediaUploadLimits = {
  maxFileCount: 10,
  maxFileSize: "8MB",
} as const;
