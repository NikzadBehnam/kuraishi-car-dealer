import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseInquiryEmailConfig } from "./inquiry-email-config.ts";

const testEnv = {
  NODE_ENV: "test",
  INQUIRY_TEST_MODE: "true",
  INQUIRY_EMAIL_MODE: "test",
  RESEND_API_KEY: "re_synthetic_not_a_real_key",
  INQUIRY_EMAIL_FROM: "anfragen@notifications.kuraishicars.com",
  INQUIRY_EMAIL_TO: "delivered@resend.dev",
  INQUIRY_EMAIL_INBOX_ORIGIN: "http://localhost:3000",
};

describe("inquiry notification configuration", () => {
  it("defaults to disabled without requiring or returning unused credentials", () => {
    assert.deepEqual(parseInquiryEmailConfig({}), { mode: "disabled" });
    assert.deepEqual(
      parseInquiryEmailConfig({ ...testEnv, INQUIRY_EMAIL_MODE: "disabled" }),
      { mode: "disabled" },
    );
    for (const mode of ["", "live", "true", "invalid"]) {
      assert.throws(
        () => parseInquiryEmailConfig({ ...testEnv, INQUIRY_EMAIL_MODE: mode }),
        /INQUIRY_EMAIL_MODE/,
      );
    }
  });

  it("restricts enabled email to isolated intake testing and the delivery simulator", () => {
    const config = parseInquiryEmailConfig(testEnv);
    assert.equal(config.mode, "test");
    if (config.mode !== "test") assert.fail("Expected test configuration.");
    assert.equal(config.provider, "resend");
    assert.equal(config.from, testEnv.INQUIRY_EMAIL_FROM);
    assert.deepEqual(config.to, ["delivered@resend.dev"]);
    assert.equal(config.inboxOrigin, "http://localhost:3000");

    for (const recipient of [
      "",
      "visitor@example.invalid",
      "delivered@resend.dev,staff@example.invalid",
      "delivered@resend.dev.attacker.example",
      "delivered@resend.dev\r\nBcc: other@example.invalid",
    ]) {
      assert.throws(
        () =>
          parseInquiryEmailConfig({ ...testEnv, INQUIRY_EMAIL_TO: recipient }),
        /INQUIRY_EMAIL_TO/,
      );
    }
    for (const change of [
      { INQUIRY_TEST_MODE: undefined },
      { INQUIRY_TEST_MODE: "false" },
      { NODE_ENV: "production" },
      { VERCEL: "1", VERCEL_ENV: "production" },
    ]) {
      assert.throws(
        () => parseInquiryEmailConfig({ ...testEnv, ...change }),
        /cannot run in Production/,
      );
    }
  });

  it("requires a plain sender mailbox on the selected subdomain and a private API key", () => {
    for (const from of [
      "",
      "visitor@example.invalid",
      "anfragen@kuraishicars.com",
      "anfragen@notifications.kuraishi-autohandel.at",
      "anfragen@notifications.kuraishicars.com.attacker.example",
      "Dealer <anfragen@notifications.kuraishicars.com>",
      "anfragen@notifications.kuraishicars.com\r\nBcc: other@example.invalid",
    ]) {
      assert.throws(
        () => parseInquiryEmailConfig({ ...testEnv, INQUIRY_EMAIL_FROM: from }),
        /INQUIRY_EMAIL_FROM/,
      );
    }
    for (const key of [undefined, "", "wrong-provider", "re_key\r\nInjected"]) {
      assert.throws(
        () => parseInquiryEmailConfig({ ...testEnv, RESEND_API_KEY: key }),
        (error: unknown) =>
          error instanceof Error &&
          error.message === "RESEND_API_KEY must contain a Resend API key.",
      );
    }
  });

  it("binds protected inbox links to the current isolated app, not an arbitrary or production host", () => {
    for (const origin of [
      "https://www.kuraishicars.com",
      "https://attacker.example",
      "http://localhost:3000/",
      "http://localhost:3000/admin/leads",
      "http://localhost:3000?target=other",
    ]) {
      assert.throws(
        () =>
          parseInquiryEmailConfig({
            ...testEnv,
            INQUIRY_EMAIL_INBOX_ORIGIN: origin,
          }),
        /INQUIRY_EMAIL_INBOX_ORIGIN/,
      );
    }
    const previewEnv = {
      ...testEnv,
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_URL: "synthetic-preview.vercel.app",
      INQUIRY_EMAIL_INBOX_ORIGIN: "https://synthetic-preview.vercel.app",
    };
    assert.equal(parseInquiryEmailConfig(previewEnv).mode, "test");
    for (const change of [
      { INQUIRY_EMAIL_INBOX_ORIGIN: "https://other-preview.vercel.app" },
      { VERCEL_URL: "synthetic-preview.vercel.app.attacker.example" },
      { VERCEL_URL: "user:password@synthetic-preview.vercel.app" },
      { VERCEL_URL: "synthetic-preview.vercel.app/path" },
      { VERCEL_URL: undefined },
      { VERCEL_ENV: "production" },
    ]) {
      assert.throws(() =>
        parseInquiryEmailConfig({ ...previewEnv, ...change }),
      );
    }
  });
});
