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
  const bucket = requiredEnv("MEDIA_PRIVATE_BUCKET");
  const publicBucket = process.env.MEDIA_PUBLIC_BUCKET;
  if (publicBucket && bucket === publicBucket) {
    throw new Error("The private and public media buckets must be different.");
  }
  return bucket;
}

export function getPublicMediaBucket(): string {
  const bucket = requiredEnv("MEDIA_PUBLIC_BUCKET");
  if (bucket === process.env.MEDIA_PRIVATE_BUCKET) {
    throw new Error("The private and public media buckets must be different.");
  }
  return bucket;
}

export function getPublicMediaObjectUrl(asset: {
  objectKey: string;
  bucketAccess: "private" | "public_read";
  publicApprovedAt: Date | null;
  publicApprovedById: string | null;
}): string | null {
  if (asset.bucketAccess === "private") {
    return null;
  }
  if (!asset.publicApprovedAt || !asset.publicApprovedById) {
    throw new Error("Public media requires a recorded approval.");
  }

  const publicBucket = getPublicMediaBucket();

  const endpoint = new URL(requiredEnv("AWS_ENDPOINT_URL_S3"));
  if (
    endpoint.protocol !== "https:" ||
    endpoint.pathname !== "/" ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash
  ) {
    throw new Error("AWS_ENDPOINT_URL_S3 must be an HTTPS origin.");
  }

  const objectKeyParts = asset.objectKey.split("/");
  if (
    objectKeyParts.some(
      (part) => part.length === 0 || part === "." || part === "..",
    )
  ) {
    throw new Error("Media object key is invalid.");
  }

  endpoint.pathname = `/${[publicBucket, ...objectKeyParts]
    .map(encodeURIComponent)
    .join("/")}`;
  return endpoint.toString();
}
