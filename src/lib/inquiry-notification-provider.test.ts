import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseInquiryEmailConfig } from "./inquiry-email-config.ts";
import { sendResendNotification } from "./inquiry-notification-provider.ts";
import { InquiryNotificationDeliveryError } from "./inquiry-notification-retry.ts";

const env = {
  NODE_ENV: "test",
  INQUIRY_TEST_MODE: "true",
  INQUIRY_EMAIL_MODE: "test",
  RESEND_API_KEY: "re_synthetic_not_a_real_key",
  INQUIRY_EMAIL_FROM: "anfragen@notifications.kuraishicars.com",
  INQUIRY_EMAIL_TO: "delivered@resend.dev",
  INQUIRY_EMAIL_INBOX_ORIGIN: "http://localhost:3000",
};
const config = parseInquiryEmailConfig(env);
if (config.mode !== "test")
  throw new Error("Expected test-only configuration.");
const notification = {
  subject: "[TEST] New inquiry",
  text: "Synthetic alert.",
  html: "<p>Synthetic alert.</p>",
};

describe("Resend provider adapter", () => {
  it("sends only the configured simulator message with stable idempotency and no reply-to", async () => {
    let captured:
      { url: string | URL | Request; init?: RequestInit } | undefined;
    const messageId = await sendResendNotification(
      notification,
      "inquiry-synthetic-idempotency-key",
      config,
      async (url, init) => {
        captured = { url, init };
        return Response.json({ id: "synthetic-provider-id" });
      },
    );
    assert.equal(messageId, "synthetic-provider-id");
    assert.equal(captured?.url, "https://api.resend.com/emails");
    assert.equal(captured?.init?.method, "POST");
    const headers = new Headers(captured?.init?.headers);
    assert.equal(
      headers.get("idempotency-key"),
      "inquiry-synthetic-idempotency-key",
    );
    assert.equal(headers.get("authorization"), `Bearer ${env.RESEND_API_KEY}`);
    const body = JSON.parse(String(captured?.init?.body)) as Record<
      string,
      unknown
    >;
    assert.deepEqual(body.to, ["delivered@resend.dev"]);
    assert.equal(body.from, env.INQUIRY_EMAIL_FROM);
    assert.equal(body.subject, notification.subject);
    assert.equal("reply_to" in body, false);
  });

  it("retries throttles/server errors and network failures, but stops on provider rejection", async () => {
    for (const status of [429, 500, 503]) {
      await assert.rejects(
        sendResendNotification(
          notification,
          "synthetic-idempotency",
          config,
          async () => new Response(null, { status }),
        ),
        (error: unknown) =>
          error instanceof InquiryNotificationDeliveryError &&
          error.code === "provider_unavailable" &&
          error.retryable,
      );
    }
    await assert.rejects(
      sendResendNotification(
        notification,
        "synthetic-idempotency",
        config,
        async () => new Response(null, { status: 403 }),
      ),
      (error: unknown) =>
        error instanceof InquiryNotificationDeliveryError &&
        error.code === "provider_rejected" &&
        !error.retryable,
    );
    await assert.rejects(
      sendResendNotification(
        notification,
        "synthetic-idempotency",
        config,
        async () => {
          throw new Error("private provider response details");
        },
      ),
      (error: unknown) =>
        error instanceof InquiryNotificationDeliveryError &&
        error.code === "provider_unavailable" &&
        error.message === "Inquiry notification delivery failed.",
    );
    await assert.rejects(
      sendResendNotification(
        notification,
        "synthetic-idempotency",
        config,
        async () => {
          throw new DOMException("Request timed out.", "TimeoutError");
        },
      ),
      (error: unknown) =>
        error instanceof InquiryNotificationDeliveryError &&
        error.code === "provider_unavailable" &&
        error.retryable,
    );
  });

  it("retries malformed success responses without exposing provider payloads", async () => {
    for (const response of [
      new Response("not-json"),
      Response.json({ error: "private customer or provider detail" }),
      Response.json({ id: "x".repeat(201) }),
    ]) {
      await assert.rejects(
        sendResendNotification(
          notification,
          "synthetic-idempotency",
          config,
          async () => response,
        ),
        (error: unknown) =>
          error instanceof InquiryNotificationDeliveryError &&
          error.code === "provider_response_invalid" &&
          error.retryable &&
          !error.message.includes("private"),
      );
    }
  });
});
