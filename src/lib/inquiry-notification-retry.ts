import { createHash } from "node:crypto";

import { inquiryTestModeEnabled } from "./inquiry-validation.ts";

export const MAX_INQUIRY_NOTIFICATION_ATTEMPTS = 5;
export const INQUIRY_NOTIFICATION_BATCH_SIZE = 10;
export const INQUIRY_NOTIFICATION_LEASE_MS = 2 * 60 * 1000;

const retryDelaysMs = [
  60_000,
  5 * 60_000,
  30 * 60_000,
  2 * 60 * 60_000,
] as const;

export type InquiryNotificationErrorCode =
  | "provider_rejected"
  | "provider_unavailable"
  | "provider_response_invalid"
  | "configuration_invalid"
  | "invalid_notification"
  | "attempts_exhausted";

export function getInitialInquiryNotificationStatus(
  env: Readonly<Record<string, string | undefined>>,
): "disabled" | "pending" {
  return env.INQUIRY_EMAIL_MODE === "test" && inquiryTestModeEnabled(env)
    ? "pending"
    : "disabled";
}

export class InquiryNotificationDeliveryError extends Error {
  readonly code: InquiryNotificationErrorCode;
  readonly retryable: boolean;

  constructor(code: InquiryNotificationErrorCode, retryable: boolean) {
    super("Inquiry notification delivery failed.");
    this.name = "InquiryNotificationDeliveryError";
    this.code = code;
    this.retryable = retryable;
  }
}

export function getInquiryNotificationFailureTransition(
  attemptCount: number,
  now: Date,
  errorCode: InquiryNotificationErrorCode,
  retryable: boolean,
) {
  if (
    !Number.isInteger(attemptCount) ||
    attemptCount < 1 ||
    attemptCount > MAX_INQUIRY_NOTIFICATION_ATTEMPTS ||
    !Number.isFinite(now.getTime())
  ) {
    throw new Error("Inquiry notification retry state is invalid.");
  }
  const delay = retryDelaysMs[attemptCount - 1];
  if (!retryable || delay === undefined) {
    return { status: "failed" as const, nextAttemptAt: null, errorCode };
  }
  return {
    status: "retry" as const,
    nextAttemptAt: new Date(now.getTime() + delay),
    errorCode,
  };
}

export function getInquiryNotificationIdempotencyKey(
  inquiryId: string,
): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(inquiryId)) {
    throw new Error("Inquiry notification reference is invalid.");
  }
  return `inquiry-${createHash("sha256").update(inquiryId).digest("hex")}`;
}
