import { timingSafeEqual } from "node:crypto";

import { inquiryTestModeEnabled } from "./inquiry-validation.ts";

function response(body: object, status: number, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function hasValidBearerToken(request: Request, secret: string): boolean {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

async function hasRequestBody(request: Request): Promise<boolean> {
  if (!request.body) return false;
  const reader = request.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return false;
      if (value.byteLength > 0) return true;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function handleInquiryNotificationWorkerRequest(
  request: Request,
  runBatch: () => Promise<{
    claimed: number;
    sent: number;
    retried: number;
    failed: number;
  }>,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<Response> {
  if (request.method !== "POST") {
    return response({ error: "Method not allowed." }, 405, { Allow: "POST" });
  }
  if (env.INQUIRY_EMAIL_MODE !== "test" || !inquiryTestModeEnabled(env)) {
    return response({ error: "Notification processing is unavailable." }, 503);
  }
  const secret = env.INQUIRY_NOTIFICATION_CRON_SECRET;
  if (!secret || secret.length < 32) {
    console.error("Inquiry notification worker configuration is incomplete.");
    return response({ error: "Notification processing is unavailable." }, 503);
  }
  if (!hasValidBearerToken(request, secret)) {
    return response({ error: "Unauthorized." }, 401);
  }
  try {
    if (await hasRequestBody(request)) {
      return response({ error: "Request body must be empty." }, 400);
    }
  } catch {
    return response({ error: "Request body could not be read." }, 400);
  }
  try {
    return response({ ok: true, ...(await runBatch()) }, 200);
  } catch (error) {
    console.error("Inquiry notification batch failed.", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return response({ error: "Notification processing failed." }, 503);
  }
}
