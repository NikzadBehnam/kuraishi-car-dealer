import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  assertAuthenticatedSession,
  assertCapability,
  authCapabilities,
  authCapabilityValues,
  getAuthorizationState,
  getAuthRoles,
  hasCapability,
} from "./authorization-policy.ts";
import { authRoles } from "./roles.ts";

describe("capability authorization policy", () => {
  it("rejects an anonymous caller with a standardized authentication error", () => {
    assert.equal(getAuthorizationState(null).status, "anonymous");
    assert.throws(
      () => assertAuthenticatedSession(null),
      (error) =>
        error instanceof AuthenticationRequiredError &&
        error.code === "AUTHENTICATION_REQUIRED" &&
        error.status === 401,
    );
  });

  it("allows CUSTOMER to manage only their own saved-vehicle state", () => {
    const session = { user: { role: authRoles.customer } };

    assert.equal(
      hasCapability(session, authCapabilities.manageOwnFavourites),
      true,
    );
    assert.equal(
      hasCapability(session, authCapabilities.manageOwnComparisons),
      true,
    );
    assert.equal(hasCapability(session, authCapabilities.enterAdmin), false);
    assert.throws(
      () => assertCapability(session, authCapabilities.manageVehicles),
      (error) =>
        error instanceof AuthorizationDeniedError &&
        error.code === "FORBIDDEN" &&
        error.reason === "MISSING_CAPABILITY" &&
        error.status === 403,
    );
  });

  it("keeps STAFF outside admin while preserving approved account capabilities", () => {
    const session = { user: { role: authRoles.staff } };

    assert.equal(
      hasCapability(session, authCapabilities.manageOwnFavourites),
      true,
    );
    assert.equal(
      hasCapability(session, authCapabilities.manageOwnComparisons),
      true,
    );
    assert.equal(hasCapability(session, authCapabilities.enterAdmin), false);
    assert.equal(
      hasCapability(session, authCapabilities.manageAppointments),
      false,
    );
  });

  it("grants ADMIN every declared capability", () => {
    const session = { user: { role: authRoles.admin } };

    for (const capability of authCapabilityValues) {
      assert.equal(hasCapability(session, capability), true);
      assert.equal(assertCapability(session, capability), session);
    }
  });

  it("denies every protected operation to a banned user", () => {
    const session = {
      user: { banned: true, role: authRoles.admin },
    };

    assert.equal(getAuthorizationState(session).status, "banned");

    for (const capability of authCapabilityValues) {
      assert.equal(hasCapability(session, capability), false);
    }

    assert.throws(
      () => assertAuthenticatedSession(session),
      (error) =>
        error instanceof AuthorizationDeniedError &&
        error.reason === "BANNED" &&
        error.code === "FORBIDDEN",
    );
  });

  it("supports deduplicated comma-separated roles", () => {
    const session = {
      user: {
        role: `${authRoles.staff}, ${authRoles.admin}, ${authRoles.staff}`,
      },
    };

    assert.deepEqual(getAuthRoles(session.user.role), [
      authRoles.staff,
      authRoles.admin,
    ]);
    assert.equal(hasCapability(session, authCapabilities.enterAdmin), true);
    assert.equal(
      hasCapability(session, authCapabilities.manageVehicles),
      true,
    );
  });
});
