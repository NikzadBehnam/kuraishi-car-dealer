import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

import { handleInquiryNotificationWorkerRequest } from "./inquiry-notification-worker-http.ts";

const secret = "synthetic-worker-secret-not-for-deployment-12345";
const env = {
  NODE_ENV: "test",
  INQUIRY_TEST_MODE: "true",
  INQUIRY_EMAIL_MODE: "test",
  INQUIRY_NOTIFICATION_CRON_SECRET: secret,
};

function request(method = "POST", token?: string, body?: string): Request {
  return new Request(
    "http://localhost:3000/api/internal/inquiry-notifications",
    {
      method,
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
      body,
    },
  );
}

describe("inquiry notification worker HTTP boundary", () => {
  it("allows only an empty POST in enabled isolated test environments", async () => {
    let runs = 0;
    const run = async () => {
      runs++;
      return { claimed: 2, sent: 1, retried: 1, failed: 0 };
    };
    assert.equal(
      (
        await handleInquiryNotificationWorkerRequest(
          request("GET", secret),
          run,
          env,
        )
      ).status,
      405,
    );
    assert.equal(
      (
        await handleInquiryNotificationWorkerRequest(
          request("POST", secret, "{}"),
          run,
          env,
        )
      ).status,
      400,
    );
    for (const disabled of [
      {},
      { ...env, INQUIRY_EMAIL_MODE: "disabled" },
      { ...env, INQUIRY_TEST_MODE: "false" },
      { ...env, NODE_ENV: "production", VERCEL: "1", VERCEL_ENV: "production" },
    ]) {
      assert.equal(
        (
          await handleInquiryNotificationWorkerRequest(
            request("POST", secret),
            run,
            disabled,
          )
        ).status,
        503,
      );
    }
    assert.equal(runs, 0);
  });

  it("requires a matching private bearer secret and returns only aggregate outcomes", async () => {
    const run = async () => ({
      claimed: 1,
      sent: 1,
      retried: 0,
      failed: 0,
    });
    const logger = mock.method(console, "error", () => {});
    try {
      for (const token of [undefined, "wrong-worker-secret"]) {
        const result = await handleInquiryNotificationWorkerRequest(
          request("POST", token),
          async () => {
            assert.fail("Unauthorized requests must not run a batch.");
          },
          env,
        );
        assert.equal(result.status, 401);
        assert.equal(result.headers.get("cache-control"), "no-store");
      }
      const success = await handleInquiryNotificationWorkerRequest(
        request("POST", secret),
        run,
        env,
      );
      assert.equal(success.status, 200);
      assert.deepEqual(await success.json(), {
        ok: true,
        claimed: 1,
        sent: 1,
        retried: 0,
        failed: 0,
      });
      const brokenConfiguration = await handleInquiryNotificationWorkerRequest(
        request("POST", secret),
        run,
        { ...env, INQUIRY_NOTIFICATION_CRON_SECRET: "short" },
      );
      assert.equal(brokenConfiguration.status, 503);
      assert.equal(logger.mock.callCount(), 1);
      assert.equal(JSON.stringify(logger.mock.calls).includes(secret), false);
    } finally {
      logger.mock.restore();
    }
  });

  it("returns a generic sanitized failure when batch processing fails", async () => {
    const logger = mock.method(console, "error", () => {});
    try {
      const result = await handleInquiryNotificationWorkerRequest(
        request("POST", secret),
        async () => {
          throw new Error("private customer or provider payload");
        },
        env,
      );
      assert.equal(result.status, 503);
      assert.equal((await result.text()).includes("private customer"), false);
      assert.equal(
        JSON.stringify(logger.mock.calls).includes("private customer"),
        false,
      );
    } finally {
      logger.mock.restore();
    }
  });
});
