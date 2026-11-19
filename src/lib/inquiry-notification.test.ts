import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createStaffInquiryNotification } from "./inquiry-notification.ts";

const env = {
  NODE_ENV: "test",
  INQUIRY_TEST_MODE: "true",
  INQUIRY_EMAIL_MODE: "test",
  RESEND_API_KEY: "re_synthetic_not_a_real_key",
  INQUIRY_EMAIL_FROM: "anfragen@notifications.kuraishicars.com",
  INQUIRY_EMAIL_TO: "delivered@resend.dev",
  INQUIRY_EMAIL_INBOX_ORIGIN: "http://localhost:3000",
};
const inquiry = {
  id: "synthetic-inquiry-1",
  source: "contact",
  requestedService: "consultation",
  preferredDate: null,
  vehicleTitleSnapshot: null,
  vehicleSlugSnapshot: null,
};

describe("staff inquiry notification content", () => {
  it("renders all five stored service/source combinations without a booking promise", () => {
    for (const [requestedService, source, serviceLabel, sourceLabel] of [
      ["test_drive", "test_drive", "Probefahrt", "Test drive"],
      ["consultation", "contact", "Beratung", "Contact"],
      ["vehicle_valuation", "contact", "Fahrzeugbewertung", "Contact"],
      ["workshop", "contact", "Werkstatt", "Contact"],
      ["callback", "callback", "Rückruf", "Callback"],
    ]) {
      const result = createStaffInquiryNotification(
        { ...inquiry, requestedService, source },
        env,
      );
      assert.equal(result.subject, "[TEST] New inquiry");
      assert.ok(result.text.includes(`Inquiry reference: ${inquiry.id}`));
      assert.ok(result.text.includes(`Source: ${sourceLabel}`));
      assert.ok(result.text.includes(`Requested service: ${serviceLabel}`));
      assert.ok(result.text.includes("not a confirmed appointment"));
      assert.equal(result.text.includes("Vehicle reference:"), false);
      assert.equal(result.text.includes("Requested date:"), false);
      assert.equal(result.text.includes("null"), false);
    }
  });

  it("omits private/current-future customer fields, headers and credentials from the complete output", () => {
    const result = createStaffInquiryNotification(
      {
        ...inquiry,
        customerName: "PRIVATE-NAME",
        customerEmail: "private@example.invalid",
        customerPhone: "+436641234567",
        message: "PRIVATE-MESSAGE",
        privacyNoticeText: "PRIVATE-NOTICE",
        submissionHash: "PRIVATE-HASH",
        futurePrivateField: "PRIVATE-FUTURE",
        inboxOrigin: "https://attacker.example",
      },
      env,
    );
    assert.deepEqual(result, createStaffInquiryNotification(inquiry, env));
    assert.deepEqual(Object.keys(result).sort(), ["html", "subject", "text"]);
    assert.equal(JSON.stringify(result).includes(env.RESEND_API_KEY), false);
  });

  it("escapes vehicle snapshots in HTML while preserving the original plain text and business date", () => {
    const title = `Example <img src=x onerror="alert(1)"> & 'Edition'`;
    const result = createStaffInquiryNotification(
      {
        ...inquiry,
        vehicleTitleSnapshot: title,
        vehicleSlugSnapshot: "example-edition",
        preferredDate: new Date("2000-01-01T00:00:00.000Z"),
      },
      env,
    );
    assert.ok(result.text.includes(`Vehicle reference: ${title}`));
    assert.ok(
      result.text.includes("Vehicle slug at submission: example-edition"),
    );
    assert.ok(result.text.includes("Requested date: 2000-01-01"));
    assert.ok(
      result.html.includes("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;"),
    );
    assert.ok(result.html.includes("&amp; &#39;Edition&#39;"));
    assert.equal(result.html.includes("<img"), false);
    assert.equal(result.subject.includes(title), false);
  });

  it("links only to the configured protected inbox without identity, tokens or unsupported detail parameters", () => {
    const local = createStaffInquiryNotification(inquiry, env);
    assert.ok(local.html.includes('href="http://localhost:3000/admin/leads"'));
    const preview = createStaffInquiryNotification(inquiry, {
      ...env,
      NODE_ENV: "production",
      VERCEL: "1",
      VERCEL_ENV: "preview",
      VERCEL_URL: "synthetic-preview.vercel.app",
      INQUIRY_EMAIL_INBOX_ORIGIN: "https://synthetic-preview.vercel.app",
    });
    const links = [...preview.html.matchAll(/href="([^"]+)"/g)];
    assert.deepEqual(
      links.map((match) => match[1]),
      ["https://synthetic-preview.vercel.app/admin/leads"],
    );
    assert.ok(preview.text.includes(links[0][1]));
    for (const unsafeOrigin of [
      "https://attacker.example",
      "https://www.kuraishicars.com",
      "http://localhost:3000/admin/leads?token=forged",
    ]) {
      assert.throws(() =>
        createStaffInquiryNotification(inquiry, {
          ...env,
          INQUIRY_EMAIL_INBOX_ORIGIN: unsafeOrigin,
        }),
      );
    }
  });

  it("rejects malformed or inconsistent stored projections rather than creating a misleading alert", () => {
    for (const change of [
      { id: "reference\r\nBcc: other@example.invalid" },
      { source: "test-drive" },
      { source: "callback" },
      { requestedService: "not-a-service" },
      { preferredDate: new Date("invalid") },
      { preferredDate: "2026-11-19" },
      { vehicleTitleSnapshot: "Example", vehicleSlugSnapshot: null },
      { vehicleTitleSnapshot: null, vehicleSlugSnapshot: "example" },
      { vehicleTitleSnapshot: "Example", vehicleSlugSnapshot: "../private" },
      {
        vehicleTitleSnapshot: "Example\nInjected",
        vehicleSlugSnapshot: "example",
      },
    ]) {
      assert.throws(
        () => createStaffInquiryNotification({ ...inquiry, ...change }, env),
        /Stored inquiry/,
      );
    }
  });

  it("cannot render sendable content when notifications are disabled or Production is selected", () => {
    for (const change of [
      { INQUIRY_EMAIL_MODE: "disabled" },
      { INQUIRY_EMAIL_MODE: "live" },
      { NODE_ENV: "production" },
      { VERCEL: "1", VERCEL_ENV: "production" },
      { INQUIRY_EMAIL_TO: "visitor@example.invalid" },
    ]) {
      assert.throws(() =>
        createStaffInquiryNotification(inquiry, { ...env, ...change }),
      );
    }
  });
});
