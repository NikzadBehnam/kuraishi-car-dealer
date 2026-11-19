import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getInitialInquiryNotificationStatus,
  getInquiryNotificationFailureTransition,
  getInquiryNotificationIdempotencyKey,
  INQUIRY_NOTIFICATION_BATCH_SIZE,
  INQUIRY_NOTIFICATION_LEASE_MS,
  MAX_INQUIRY_NOTIFICATION_ATTEMPTS,
} from "./inquiry-notification-retry.ts";

const start = new Date("2026-11-19T12:00:00.000Z");
const previewEnv = {
  NODE_ENV: "production",
  VERCEL: "1",
  VERCEL_ENV: "preview",
  INQUIRY_TEST_MODE: "true",
  INQUIRY_EMAIL_MODE: "test",
};

describe("inquiry notification delivery policy", () => {
  it("only enqueues delivery for enabled isolated intake", () => {
    assert.equal(getInitialInquiryNotificationStatus({}), "disabled");
    assert.equal(
      getInitialInquiryNotificationStatus({
        ...previewEnv,
        VERCEL_ENV: "production",
      }),
      "disabled",
    );
    assert.equal(
      getInitialInquiryNotificationStatus({
        ...previewEnv,
        INQUIRY_EMAIL_MODE: "disabled",
      }),
      "disabled",
    );
    assert.equal(getInitialInquiryNotificationStatus(previewEnv), "pending");
    assert.equal(INQUIRY_NOTIFICATION_BATCH_SIZE, 10);
    assert.equal(INQUIRY_NOTIFICATION_LEASE_MS, 120_000);
    assert.equal(MAX_INQUIRY_NOTIFICATION_ATTEMPTS, 5);
  });

  it("uses a bounded exponential-ish retry schedule and terminates exhausted/permanent failures", () => {
    const delays = [60_000, 300_000, 1_800_000, 7_200_000];
    delays.forEach((delay, index) => {
      const transition = getInquiryNotificationFailureTransition(
        index + 1,
        start,
        "provider_unavailable",
        true,
      );
      assert.equal(transition.status, "retry");
      assert.equal(
        transition.nextAttemptAt?.getTime(),
        start.getTime() + delay,
      );
    });
    assert.deepEqual(
      getInquiryNotificationFailureTransition(
        5,
        start,
        "provider_unavailable",
        true,
      ),
      {
        status: "failed",
        nextAttemptAt: null,
        errorCode: "provider_unavailable",
      },
    );
    assert.equal(
      getInquiryNotificationFailureTransition(
        1,
        start,
        "provider_rejected",
        false,
      ).status,
      "failed",
    );
  });

  it("creates a stable bounded provider idempotency key and rejects unsafe references", () => {
    const first = getInquiryNotificationIdempotencyKey("inquiry_test-123");
    assert.equal(
      first,
      getInquiryNotificationIdempotencyKey("inquiry_test-123"),
    );
    assert.notEqual(
      first,
      getInquiryNotificationIdempotencyKey("inquiry_test-124"),
    );
    assert.match(first, /^inquiry-[0-9a-f]{64}$/);
    assert.ok(first.length <= 80);
    for (const id of ["", "../other", "white space", "x".repeat(129), "\r\n"]) {
      assert.throws(() => getInquiryNotificationIdempotencyKey(id));
    }
  });

  it("rejects invalid attempt counters and clocks", () => {
    for (const count of [0, -1, 1.5, 6, Number.NaN]) {
      assert.throws(() =>
        getInquiryNotificationFailureTransition(
          count,
          start,
          "provider_unavailable",
          true,
        ),
      );
    }
    assert.throws(() =>
      getInquiryNotificationFailureTransition(
        1,
        new Date("invalid"),
        "provider_unavailable",
        true,
      ),
    );
  });
});
