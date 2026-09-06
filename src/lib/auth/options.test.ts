import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createKuraishiAuthOptions,
  getAuthTrustedOrigins,
  localAuthOrigin,
  productionAuthOrigin,
} from "./options.ts";

describe("auth options", () => {
  it("revokes existing sessions after password reset", () => {
    const options = createKuraishiAuthOptions({
      baseURL: localAuthOrigin,
      emailDelivery: {
        sendPasswordResetEmail: async () => {},
        sendVerificationEmail: async () => {},
      },
      googleClientId: "google-client-id",
      googleClientSecret: "google-client-secret",
      secret: "test-secret",
      useSecureCookies: false,
    });

    assert.equal(options.emailAndPassword.revokeSessionsOnPasswordReset, true);
  });

  it("configures Google only when both OAuth credentials are present", () => {
    const configuredOptions = createKuraishiAuthOptions({
      baseURL: localAuthOrigin,
      emailDelivery: {
        sendPasswordResetEmail: async () => {},
        sendVerificationEmail: async () => {},
      },
      googleClientId: "google-client-id",
      googleClientSecret: "google-client-secret",
      secret: "test-secret",
      useSecureCookies: false,
    });
    const unconfiguredOptions = createKuraishiAuthOptions({
      baseURL: localAuthOrigin,
      emailDelivery: {
        sendPasswordResetEmail: async () => {},
        sendVerificationEmail: async () => {},
      },
      secret: "test-secret",
      useSecureCookies: false,
    });

    assert.ok(configuredOptions.socialProviders?.google);
    assert.equal(unconfiguredOptions.socialProviders, undefined);
  });

  it("does not trust localhost in production auth config", () => {
    assert.deepEqual(getAuthTrustedOrigins("production"), [
      productionAuthOrigin,
    ]);
    assert.deepEqual(getAuthTrustedOrigins("development"), [
      localAuthOrigin,
      productionAuthOrigin,
    ]);
  });

  it("trusts Vercel deployment origins exposed by system environment variables", () => {
    assert.deepEqual(
      getAuthTrustedOrigins("production", {
        VERCEL_BRANCH_URL: "kuraishi-car-dealer-git-auth-test.vercel.app",
        VERCEL_PROJECT_PRODUCTION_URL: "kuraishi-car-dealer.vercel.app",
        VERCEL_URL: "kuraishi-car-dealer-abc123.vercel.app",
      }),
      [
        productionAuthOrigin,
        "https://kuraishi-car-dealer-abc123.vercel.app",
        "https://kuraishi-car-dealer-git-auth-test.vercel.app",
      ],
    );
  });
});
