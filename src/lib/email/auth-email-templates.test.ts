import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  renderPasswordResetEmail,
  renderVerificationEmail,
} from "./auth-email-templates.ts";

describe("auth email templates", () => {
  it("renders a branded verification email with escaped dynamic content", () => {
    const email = renderVerificationEmail({
      actionUrl:
        "https://kuraishi-car-dealer.vercel.app/api/auth/verify?token=abc&next=%3Cadmin%3E",
      recipientName: "  Ada <Admin>  ",
    });

    assert.equal(email.subject, "Verify your Kuraishi account");
    assert.match(email.html, /Kuraishi Autohandel/);
    assert.match(email.html, /Hello Ada &lt;Admin&gt;,/);
    assert.doesNotMatch(email.html, /Hello Ada <Admin>,/);
    assert.match(email.html, /token=abc&amp;next=%3Cadmin%3E/);
    assert.match(email.text, /Hello Ada <Admin>,/);
  });

  it("renders a separate password reset template", () => {
    const email = renderPasswordResetEmail({
      actionUrl:
        "https://kuraishi-car-dealer.vercel.app/reset-password?token=reset-token",
      recipientName: null,
    });

    assert.equal(email.subject, "Reset your Kuraishi password");
    assert.match(email.html, /Reset your password/);
    assert.match(email.text, /Reset your password/);
    assert.match(email.text, /reset-token/);
  });

  it("rejects non-http action URLs", () => {
    assert.throws(
      () =>
        renderVerificationEmail({
          actionUrl: "javascript:alert(1)",
          recipientName: "Ada",
        }),
      /http or https/,
    );
  });
});
