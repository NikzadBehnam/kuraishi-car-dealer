import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { registerSchema } from "../_schemas/auth.schema.ts";

import {
  buildCredentialRegistrationRequest,
  buildVerificationPendingURL,
  getCredentialRegistrationErrorMessage,
  verificationCallbackPath,
} from "./registration-flow.ts";

describe("credential registration flow", () => {
  const validValues = {
    confirmPassword: "correct-horse-battery",
    consent: true,
    email: " ADA@example.COM ",
    firstName: "  Ada ",
    lastName: " Lovelace  ",
    password: "correct-horse-battery",
    phone: "  +43 664 123 45 67 ",
  };

  it("validates password confirmation and consent before submission", () => {
    assert.equal(
      registerSchema.safeParse({
        ...validValues,
        confirmPassword: "different-password",
      }).success,
      false,
    );
    assert.equal(
      registerSchema.safeParse({
        ...validValues,
        consent: false,
      }).success,
      false,
    );
  });

  it("maps successful form values to the Better Auth signup request", () => {
    const request = buildCredentialRegistrationRequest(validValues);

    assert.deepEqual(request, {
      callbackURL: verificationCallbackPath,
      consent: true,
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      name: "Ada Lovelace",
      password: "correct-horse-battery",
      phone: "+43 664 123 45 67",
    });
  });

  it("does not leak account-existence provider errors", () => {
    assert.equal(
      getCredentialRegistrationErrorMessage({
        code: "USER_ALREADY_EXISTS",
        message: "User already exists",
        status: 422,
      }),
      "We could not complete registration. Check the details and try again.",
    );
  });

  it("keeps pending verification redirects email-scoped", () => {
    assert.equal(
      buildVerificationPendingURL("ADA@example.COM"),
      "/verify-email?email=ada%40example.com",
    );
  });
});
