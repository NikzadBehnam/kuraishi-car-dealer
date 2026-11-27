import "server-only";

import { S3Client } from "@aws-sdk/client-s3";

let client: S3Client | undefined;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set.`);
  }
  return value;
}

export function getMediaStorageClient(): S3Client {
  if (!client) {
    client = new S3Client({
      credentials: {
        accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
      },
      endpoint: requiredEnv("AWS_ENDPOINT_URL_S3"),
      forcePathStyle: true,
      region: requiredEnv("AWS_REGION"),
      requestChecksumCalculation: "WHEN_REQUIRED",
    });
  }
  return client;
}

export function getPrivateMediaBucket(): string {
  return requiredEnv("MEDIA_PRIVATE_BUCKET");
}
