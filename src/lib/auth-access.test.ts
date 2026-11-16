import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertAdminSession,
  assertAuthenticatedSession,
  AuthorizationError,
  getAccountCreationPageRedirect,
  hasAuthenticatedSession,
} from "./auth-access.ts";

const regularSession = { user: { role: "user" } };
const adminSession = { user: { role: "admin" } };

describe("dashboard access", () => {
  it("denies anonymous sessions and permits any authenticated role", () => {
    assert.equal(hasAuthenticatedSession(null), false);
    assert.equal(hasAuthenticatedSession(regularSession), true);
    assert.equal(hasAuthenticatedSession(adminSession), true);

    assert.throws(
      () => assertAuthenticatedSession(null),
      (error: unknown) =>
        error instanceof AuthorizationError && error.status === 401,
    );
    assert.equal(assertAuthenticatedSession(regularSession), regularSession);
    assert.equal(assertAuthenticatedSession(adminSession), adminSession);
  });
});

describe("account creation access", () => {
  it("redirects anonymous and regular users while allowing the master admin", () => {
    assert.equal(getAccountCreationPageRedirect(null), "login");
    assert.equal(getAccountCreationPageRedirect(regularSession), "dashboard");
    assert.equal(getAccountCreationPageRedirect(adminSession), null);
  });

  it("requires the master admin role for the server action", () => {
    assert.throws(
      () => assertAdminSession(null),
      (error: unknown) =>
        error instanceof AuthorizationError && error.status === 401,
    );
    assert.throws(
      () => assertAdminSession(regularSession),
      (error: unknown) =>
        error instanceof AuthorizationError && error.status === 403,
    );
    assert.equal(assertAdminSession(adminSession), adminSession);
  });
});
