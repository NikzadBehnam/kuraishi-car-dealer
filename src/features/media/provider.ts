export const MEDIA_PROVIDER_NAMES = ["uploadthing"] as const;

export type MediaProviderName = (typeof MEDIA_PROVIDER_NAMES)[number];

export type StoredMediaObject = {
  provider: MediaProviderName;
  providerAssetId: string;
  url: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

export type DeleteMediaObjectsResult = {
  deletedCount: number;
};

export type MediaProviderAdapter = {
  readonly name: MediaProviderName;
  uploadFiles(files: readonly File[]): Promise<readonly StoredMediaObject[]>;
  deleteFiles(
    providerAssetIds: readonly string[],
  ): Promise<DeleteMediaObjectsResult>;
};

export type MediaProviderErrorCode =
  "CONFIGURATION_ERROR" | "INVALID_INPUT" | "UPLOAD_FAILED" | "DELETE_FAILED";

export class MediaProviderError extends Error {
  readonly code: MediaProviderErrorCode;
  readonly provider: MediaProviderName;
  override readonly cause?: unknown;

  constructor(
    code: MediaProviderErrorCode,
    message: string,
    options?: {
      cause?: unknown;
      provider?: MediaProviderName;
    },
  ) {
    super(message);
    this.name = "MediaProviderError";
    this.code = code;
    this.provider = options?.provider ?? "uploadthing";
    this.cause = options?.cause;
  }
}
