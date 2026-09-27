import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { authRoles } from "./roles.ts";
import {
  AdminAccessDeniedError,
  AdminAuthenticationRequiredError,
  assertAdminAuthorizedForServerEntry,
  getAdminAuthorizationState,
  getAdminLoginRedirectPath,
  getSafeAdminReturnPath,
  isAdminPath,
  isAdminRole,
} from "./admin-route-policy.ts";

describe("admin route policy", () => {
  it("redirects anonymous users to login with a safe admin return URL", () => {
    assert.deepEqual(
      getAdminAuthorizationState(null, "/admin/users?tab=staff"),
      {
        loginPath: "/login?callbackURL=%2Fadmin%2Fusers%3Ftab%3Dstaff",
        status: "anonymous",
      },
    );
  });

  it("forbids CUSTOMER and STAFF sessions", () => {
    assert.equal(
      getAdminAuthorizationState({ user: { role: authRoles.customer } }).status,
      "forbidden",
    );
    assert.equal(
      getAdminAuthorizationState({ user: { role: authRoles.staff } }).status,
      "forbidden",
    );
  });

  it("authorizes ADMIN sessions", () => {
    assert.equal(
      getAdminAuthorizationState({ user: { role: authRoles.admin } }).status,
      "authorized",
    );
  });

  it("forbids a banned ADMIN session", () => {
    assert.equal(
      getAdminAuthorizationState({
        user: { banned: true, role: authRoles.admin },
      }).status,
      "forbidden",
    );
  });

  it("supports comma-separated Better Auth admin-plugin roles", () => {
    assert.equal(isAdminRole(`${authRoles.staff}, ${authRoles.admin}`), true);
  });

  it("sanitizes admin callback URLs to prevent open redirects", () => {
    assert.equal(getSafeAdminReturnPath("https://example.com/admin"), "/admin");
    assert.equal(getSafeAdminReturnPath("//example.com/admin"), "/admin");
    assert.equal(getSafeAdminReturnPath("/login"), "/admin");
    assert.equal(getSafeAdminReturnPath("/api/auth/sign-out"), "/admin");
    assert.equal(getSafeAdminReturnPath("/admin/../login"), "/admin");
    assert.equal(
      getSafeAdminReturnPath("/admin/vehicles?status=draft#table"),
      "/admin/vehicles?status=draft#table",
    );
  });

  it("throws for direct server entry calls without an admin session", () => {
    assert.throws(
      () => assertAdminAuthorizedForServerEntry(null, "/admin/activity"),
      (error) =>
        error instanceof AdminAuthenticationRequiredError &&
        error.loginPath ===
          getAdminLoginRedirectPath("/admin/activity"),
    );
    assert.throws(
      () =>
        assertAdminAuthorizedForServerEntry({
          user: { role: authRoles.staff },
        }),
      AdminAccessDeniedError,
    );
    assert.deepEqual(
      assertAdminAuthorizedForServerEntry({
        user: { role: authRoles.admin },
      }),
      {
        user: { role: authRoles.admin },
      },
    );
  });

  it("recognizes admin paths only", () => {
    assert.equal(isAdminPath("/admin"), true);
    assert.equal(isAdminPath("/admin/users"), true);
    assert.equal(isAdminPath("/administrator"), false);
  });
});
