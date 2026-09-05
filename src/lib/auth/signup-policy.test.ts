import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { authRoles } from "./roles.ts";
import {
  applyPublicCredentialSignupUserDefaults,
  applyPublicUserAccessDefaults,
  applyTrustedOrPublicUserAccessDefaults,
  currentTermsVersion,
  preparePublicCredentialSignupBody,
} from "./signup-policy.ts";

describe("public credential signup policy", () => {
  it("requires explicit consent", () => {
    const result = preparePublicCredentialSignupBody({
      email: "ada@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      password: "correct-horse-battery-staple",
    });

    assert.equal(result.ok, false);
    assert.match(result.error, /Consent is required/);
  });

  it("normalizes public signup fields and strips privileged fields", () => {
    const result = preparePublicCredentialSignupBody({
      banned: true,
      banReason: "self-assigned",
      confirmPassword: "correct-horse-battery-staple",
      consent: true,
      email: "ada@example.com",
      emailVerified: true,
      firstName: "  Ada  ",
      lastName: "  Lovelace  ",
      password: "correct-horse-battery-staple",
      phone: "  +43 664 123 45 67  ",
      role: authRoles.admin,
      termsAcceptedAt: new Date("2000-01-01T00:00:00.000Z"),
      termsVersion: "attacker-version",
    });

    assert.equal(result.ok, true);
    assert.equal(result.body.firstName, "Ada");
    assert.equal(result.body.lastName, "Lovelace");
    assert.equal(result.body.name, "Ada Lovelace");
    assert.equal(result.body.phone, "+43 664 123 45 67");
    assert.equal(result.body.role, undefined);
    assert.equal(result.body.banned, undefined);
    assert.equal(result.body.emailVerified, undefined);
    assert.equal(result.body.confirmPassword, undefined);
    assert.equal(result.body.consent, undefined);
    assert.equal(result.body.termsAcceptedAt, undefined);
    assert.equal(result.body.termsVersion, undefined);
  });

  it("stamps server-owned public signup defaults", () => {
    const acceptedAt = new Date("2026-09-01T11:00:00.000Z");
    const result = applyPublicCredentialSignupUserDefaults(
      {
        email: "ada@example.com",
        role: authRoles.admin,
      },
      acceptedAt,
    );

    assert.equal(result.role, authRoles.customer);
    assert.equal(result.banned, false);
    assert.equal(result.banReason, null);
    assert.equal(result.banExpires, null);
    assert.equal(result.termsAcceptedAt, acceptedAt);
    assert.equal(result.termsVersion, currentTermsVersion);
  });

  it("stamps social users with access defaults without consent metadata", () => {
    const result = applyPublicUserAccessDefaults({
      email: "ada@example.com",
      emailVerified: true,
      role: authRoles.admin,
    });

    assert.equal(result.role, authRoles.customer);
    assert.equal(result.banned, false);
    assert.equal(result.banReason, null);
    assert.equal(result.banExpires, null);
    assert.equal(result.emailVerified, true);
    assert.equal("termsAcceptedAt" in result, false);
    assert.equal("termsVersion" in result, false);
  });

  it("preserves trusted admin-created roles while defaulting public users", () => {
    const trustedAdmin = applyTrustedOrPublicUserAccessDefaults({
      email: "admin@example.com",
      role: authRoles.admin,
    });
    const publicUser = applyTrustedOrPublicUserAccessDefaults({
      email: "customer@example.com",
    });

    assert.equal(trustedAdmin.role, authRoles.admin);
    assert.equal(
      (publicUser as { role: typeof authRoles.customer }).role,
      authRoles.customer,
    );
  });
});
