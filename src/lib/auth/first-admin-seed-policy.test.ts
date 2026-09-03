import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyFirstAdminSeedState,
  getFirstAdminDisplayName,
  readFirstAdminSeedInput,
} from "./first-admin-seed-policy.ts";
import { authRoles } from "./roles.ts";

const validEnv = {
  BETTER_AUTH_SECRET: "a".repeat(32),
  DATABASE_URL: "postgresql://user:password@example.com/db?sslmode=require",
  SEED_ADMIN_EMAIL: "  Admin@Example.com  ",
  SEED_ADMIN_FIRST_NAME: "  Kuraishi  ",
  SEED_ADMIN_LAST_NAME: "  Admin  ",
  SEED_ADMIN_PASSWORD: "StrongSeed#2026",
};

describe("first admin seed policy", () => {
  it("normalizes valid seed input", () => {
    const result = readFirstAdminSeedInput(validEnv);

    assert.equal(result.ok, true);

    if (!result.ok) {
      return;
    }

    assert.equal(result.input.email, "admin@example.com");
    assert.equal(result.input.firstName, "Kuraishi");
    assert.equal(result.input.lastName, "Admin");
    assert.equal(getFirstAdminDisplayName(result.input), "Kuraishi Admin");
  });

  it("reports missing variables and weak passwords without echoing secrets", () => {
    const result = readFirstAdminSeedInput({
      SEED_ADMIN_PASSWORD: "weak",
    });

    assert.equal(result.ok, false);

    if (result.ok) {
      return;
    }

    assert(result.issues.some((issue) => issue.includes("DATABASE_URL")));
    assert(result.issues.some((issue) => issue.includes("SEED_ADMIN_EMAIL")));
    assert(result.issues.some((issue) => issue.includes("BETTER_AUTH_SECRET")));
    assert(result.issues.some((issue) => issue.includes("at least 14")));
    assert(!result.issues.some((issue) => issue.includes("weak")));
  });

  it("classifies a first run as create", () => {
    assert.deepEqual(classifyFirstAdminSeedState(null), {
      action: "create",
    });
  });

  it("classifies an already configured admin as idempotent", () => {
    assert.deepEqual(
      classifyFirstAdminSeedState({
        accounts: [{ password: "hashed-password", providerId: "credential" }],
        emailVerified: true,
        role: authRoles.admin,
      }),
      {
        action: "already-configured",
      },
    );
  });

  it("refuses an existing non-admin conflict", () => {
    const result = classifyFirstAdminSeedState({
      accounts: [{ password: "hashed-password", providerId: "credential" }],
      emailVerified: true,
      role: authRoles.customer,
    });

    assert.equal(result.action, "conflict");

    if (result.action !== "conflict") {
      return;
    }

    assert(result.reasons.some((reason) => reason.includes("without ADMIN")));
  });

  it("refuses ambiguous existing admin records", () => {
    const result = classifyFirstAdminSeedState({
      accounts: [],
      emailVerified: false,
      role: authRoles.admin,
    });

    assert.equal(result.action, "conflict");

    if (result.action !== "conflict") {
      return;
    }

    assert(result.reasons.some((reason) => reason.includes("not verified")));
    assert(
      result.reasons.some((reason) => reason.includes("credential password")),
    );
  });
});
