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

  it("does not trust localhost in production auth config", () => {
    assert.deepEqual(getAuthTrustedOrigins("production"), [
      productionAuthOrigin,
    ]);
    assert.deepEqual(getAuthTrustedOrigins("development"), [
      localAuthOrigin,
      productionAuthOrigin,
    ]);
  });
});
