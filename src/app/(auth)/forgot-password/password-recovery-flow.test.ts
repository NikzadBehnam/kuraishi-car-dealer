import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../_schemas/auth.schema.ts";

import {
  buildPasswordResetRequest,
  buildResetPasswordRequest,
  getForgotPasswordErrorMessage,
  getResetPasswordErrorMessage,
  getResetPasswordPageState,
  hasPasswordResetSuccess,
  neutralPasswordResetRequestMessage,
  resetPasswordPath,
} from "./password-recovery-flow.ts";

describe("password recovery flow", () => {
  it("maps forgot-password requests to Better Auth with neutral UI messaging", () => {
    assert.deepEqual(
      buildPasswordResetRequest({ email: " ADA@example.COM " }),
      {
        email: "ada@example.com",
        redirectTo: resetPasswordPath,
      },
    );
    assert.match(neutralPasswordResetRequestMessage, /If an account can be reset/);
  });

  it("handles provider failure without account enumeration", () => {
    assert.equal(
      getForgotPasswordErrorMessage({ message: "Resend failed", status: 500 }),
      "We could not process the request right now. Try again shortly.",
    );
  });

  it("validates password confirmation", () => {
    assert.equal(
      resetPasswordSchema.safeParse({
        confirmPassword: "different-password",
        password: "correct-horse-battery",
      }).success,
      false,
    );
    assert.equal(
      forgotPasswordSchema.safeParse({ email: "ada@example.com" }).success,
      true,
    );
  });

  it("maps valid reset tokens and invalid token callbacks", () => {
    assert.deepEqual(getResetPasswordPageState({ token: "abc123" }), {
      status: "ready",
      token: "abc123",
    });
    assert.deepEqual(getResetPasswordPageState({ error: "INVALID_TOKEN" }), {
      message: "This reset link is invalid or expired. Request a fresh link.",
      status: "invalid",
    });
    assert.equal(getResetPasswordPageState({}).status, "invalid");
  });

  it("maps successful reset requests without logging or transforming tokens", () => {
    assert.deepEqual(
      buildResetPasswordRequest(
        {
          confirmPassword: "correct-horse-battery",
          password: "correct-horse-battery",
        },
        "opaque-reset-token",
      ),
      {
        newPassword: "correct-horse-battery",
        token: "opaque-reset-token",
      },
    );
  });

  it("handles invalid, used, or expired reset tokens with the same message", () => {
    assert.equal(
      getResetPasswordErrorMessage({ code: "INVALID_TOKEN", status: 400 }),
      "This reset link is invalid, expired, or has already been used.",
    );
  });

  it("detects the login success notice after reset", () => {
    assert.equal(hasPasswordResetSuccess({ passwordReset: "success" }), true);
    assert.equal(hasPasswordResetSuccess({ passwordReset: "other" }), false);
  });
});
