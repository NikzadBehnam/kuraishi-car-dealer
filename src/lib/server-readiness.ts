import { HeadBucketCommand } from "@aws-sdk/client-s3";

import { reportServerError } from "./server-error-reporting.ts";

export type ReadinessChecks = {
  database: () => Promise<void>;
  storage: () => Promise<void>;
  delivery: () => Promise<void>;
};

const defaultChecks: ReadinessChecks = {
  database: async () => {
    const { prisma } = await import("@/lib/db");
    await prisma.$queryRaw`SELECT 1`;
  },
  storage: async () => {
    const {
      getMediaStorageClient,
      getPrivateMediaBucket,
      getPublicMediaBucket,
    } = await import("@/lib/media-storage");
    const client = getMediaStorageClient();
    const abortSignal = AbortSignal.timeout(3000);
    const buckets = [getPrivateMediaBucket(), getPublicMediaBucket()];

    await Promise.all(
      buckets.map((Bucket) =>
        client.send(new HeadBucketCommand({ Bucket }), { abortSignal }),
      ),
    );
  },
  delivery: async () => {
    const { parseInquiryEmailConfig } =
      await import("@/lib/inquiry-email-config");
    parseInquiryEmailConfig(process.env);
  },
};

async function runCheck(
  dependency: "database" | "storage" | "delivery",
  check: () => Promise<void>,
): Promise<boolean> {
  try {
    await check();
    return true;
  } catch {
    reportServerError({ event: "readiness_failure", dependency });
    return false;
  }
}

export async function areDependenciesReady(
  checks: ReadinessChecks = defaultChecks,
): Promise<boolean> {
  const results = await Promise.all([
    runCheck("database", checks.database),
    runCheck("storage", checks.storage),
    runCheck("delivery", checks.delivery),
  ]);

  return results.every(Boolean);
}
