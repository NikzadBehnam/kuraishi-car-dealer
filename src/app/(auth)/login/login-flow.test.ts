import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildCredentialLoginRequest,
  getCredentialLoginErrorState,
  getSafeAuthCallbackPath,
  postLogoutRedirectPath,
} from "./login-flow.ts";

describe("credential login flow", () => {
  it("maps successful login values to Better Auth with Remember Me enabled", () => {
    assert.deepEqual(
      buildCredentialLoginRequest(
        {
          email: " ADA@example.COM ",
          password: "correct-horse-battery",
          remember: true,
        },
        "/favourites?from=login",
      ),
      {
        callbackURL: "/favourites?from=login",
        email: "ada@example.com",
        password: "correct-horse-battery",
        rememberMe: true,
      },
    );
  });

  it("maps Remember Me false to a browser-session cookie request", () => {
    assert.equal(
      buildCredentialLoginRequest(
        {
          email: "ada@example.com",
          password: "correct-horse-battery",
          remember: false,
        },
        "/",
      ).rememberMe,
      false,
    );
  });

  it("prevents open redirects in callback URLs", () => {
    assert.equal(getSafeAuthCallbackPath("https://evil.example"), "/");
    assert.equal(getSafeAuthCallbackPath("//evil.example/path"), "/");
    assert.equal(getSafeAuthCallbackPath("/api/auth/sign-out"), "/");
    assert.equal(getSafeAuthCallbackPath("/login"), "/");
    assert.equal(getSafeAuthCallbackPath("/vehicles?make=bmw#results"), "/vehicles?make=bmw#results");
  });

  it("uses non-enumerating invalid credential messaging", () => {
    assert.deepEqual(getCredentialLoginErrorState({ status: 401 }), {
      canResendVerification: false,
      message: "We could not sign you in. Check your email and password.",
    });
  });

  it("shows a verification path for unverified credential accounts", () => {
    assert.deepEqual(getCredentialLoginErrorState({ status: 403 }), {
      canResendVerification: true,
      message: "Please verify your email address before logging in.",
    });
  });

  it("defines a stable logout destination", () => {
    assert.equal(postLogoutRedirectPath, "/");
  });
});
