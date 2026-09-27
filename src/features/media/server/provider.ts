import "server-only";

import { UTApi } from "uploadthing/server";

import { type MediaProviderAdapter, MediaProviderError } from "../provider.ts";
import { createUploadThingMediaProvider } from "../uploadthing-adapter.ts";
import { readUploadThingConfig } from "../uploadthing-config.ts";

let mediaProvider: MediaProviderAdapter | null = null;

export function getMediaProvider(): MediaProviderAdapter {
  if (mediaProvider) {
    return mediaProvider;
  }

  const config = readUploadThingConfig();

  try {
    mediaProvider = createUploadThingMediaProvider(
      new UTApi({ token: config.token }),
    );
  } catch (error) {
    throw new MediaProviderError(
      "CONFIGURATION_ERROR",
      "The UploadThing media provider configuration is invalid.",
      { cause: sanitizeConfigurationError(error) },
    );
  }

  return mediaProvider;
}

function sanitizeConfigurationError(error: unknown) {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  if ("name" in error && typeof error.name === "string") {
    return { name: error.name };
  }

  return undefined;
}
