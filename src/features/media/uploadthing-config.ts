import { z } from "zod";

import { MediaProviderError } from "./provider.ts";

const uploadThingEnvironmentSchema = z.object({
  UPLOADTHING_TOKEN: z.string().trim().min(1),
});

export type UploadThingConfig = {
  token: string;
};

export function readUploadThingConfig(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): UploadThingConfig {
  const result = uploadThingEnvironmentSchema.safeParse(environment);

  if (!result.success) {
    throw new MediaProviderError(
      "CONFIGURATION_ERROR",
      "Missing media provider configuration: UPLOADTHING_TOKEN.",
    );
  }

  return { token: result.data.UPLOADTHING_TOKEN };
}
