import { z } from "zod";

import type { InquiryEmailConfig } from "./inquiry-email-config.ts";
import type { StaffInquiryNotification } from "./inquiry-notification.ts";
import { InquiryNotificationDeliveryError } from "./inquiry-notification-retry.ts";

const providerResponseSchema = z.object({ id: z.string().min(1).max(200) });

export async function sendResendNotification(
  notification: StaffInquiryNotification,
  idempotencyKey: string,
  config: Extract<InquiryEmailConfig, { mode: "test" }>,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  let response: Response;
  try {
    response = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from: config.from,
        to: config.to,
        subject: notification.subject,
        text: notification.text,
        html: notification.html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new InquiryNotificationDeliveryError("provider_unavailable", true);
  }
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw new InquiryNotificationDeliveryError(
      retryable ? "provider_unavailable" : "provider_rejected",
      retryable,
    );
  }
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new InquiryNotificationDeliveryError(
      "provider_response_invalid",
      true,
    );
  }
  const parsed = providerResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new InquiryNotificationDeliveryError(
      "provider_response_invalid",
      true,
    );
  }
  return parsed.data.id;
}
