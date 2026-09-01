import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getEmailFromSearchParams,
  getVerificationCallbackState,
  getVerificationPendingMessage,
} from "./verification-flow.ts";

describe("verification flow UI state", () => {
  it("renders the pending-verification state with the submitted email", () => {
    assert.equal(
      getVerificationPendingMessage("ada@example.com"),
      "We sent a verification link to ada@example.com.",
    );
  });

  it("supports pending-verification UI without an email query", () => {
    assert.equal(
      getVerificationPendingMessage(""),
      "Enter your email address to request another verification link.",
    );
  });

  it("maps verification callbacks to success and error states", () => {
    assert.equal(getVerificationCallbackState({}).status, "success");
    assert.deepEqual(getVerificationCallbackState({ error: "invalid_token" }), {
      description:
        "The verification link is invalid or expired. Request a fresh link and try again.",
      status: "error",
      title: "Verification link expired",
    });
  });

  it("reads only a scalar email search param", () => {
    assert.equal(
      getEmailFromSearchParams({ email: "ada@example.com" }),
      "ada@example.com",
    );
    assert.equal(
      getEmailFromSearchParams({ email: ["first@example.com"] }),
      "",
    );
  });
});
