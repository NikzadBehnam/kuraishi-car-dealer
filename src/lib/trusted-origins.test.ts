import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTrustedOrigins, isTrustedOrigin } from "./trusted-origins.ts";

describe("trusted request origins", () => {
  it("keeps the existing app origins and rejects missing or lookalike origins", () => {
    assert.deepEqual(getTrustedOrigins(true), ["https://www.kuraishicars.com"]);
    assert.equal(isTrustedOrigin("https://www.kuraishicars.com", true), true);
    assert.equal(
      isTrustedOrigin("https://www.kuraishicars.com.attacker.test", true),
      false,
    );
    assert.equal(isTrustedOrigin("https://www.kuraishicars.com/", true), false);
    assert.equal(isTrustedOrigin(null, false), false);
    assert.equal(isTrustedOrigin("http://localhost:3000", false), true);
    assert.equal(isTrustedOrigin("http://localhost:3000", true), false);
  });

  it("uses only the configured Preview origin even for a production build", () => {
    const origin = "https://dealer-git-release-team.vercel.app";
    const env = {
      VERCEL: "1",
      VERCEL_ENV: "preview",
      BETTER_AUTH_URL: origin,
    };

    assert.deepEqual(getTrustedOrigins(true, env), [origin]);
    assert.equal(isTrustedOrigin(origin, true, env), true);
    for (const otherOrigin of [
      "https://another-deployment.vercel.app",
      `${origin}.attacker.test`,
      "https://www.kuraishicars.com",
      "http://localhost:3000",
    ]) {
      assert.equal(isTrustedOrigin(otherOrigin, true, env), false);
    }

    assert.equal(
      isTrustedOrigin(origin, true, { ...env, VERCEL_ENV: "production" }),
      false,
    );
    assert.equal(isTrustedOrigin(origin, true, { ...env, VERCEL: "" }), false);
  });

  it("fails closed in Preview without a valid exact origin", () => {
    for (const origin of [
      undefined,
      "https://www.kuraishicars.com",
      "http://dealer.vercel.app",
      "https://dealer.vercel.app/",
      "https://*.vercel.app",
    ]) {
      assert.deepEqual(
        getTrustedOrigins(true, {
          VERCEL: "1",
          VERCEL_ENV: "preview",
          BETTER_AUTH_URL: origin,
        }),
        [],
      );
    }
  });

  it("can opt in to the exact provider-assigned Preview deployment host", () => {
    const env = {
      VERCEL: "1",
      VERCEL_ENV: "preview",
      BETTER_AUTH_URL: "https://preview-build.invalid",
      BETTER_AUTH_PREVIEW_USE_DEPLOYMENT_URL: "true",
      VERCEL_URL: "dealer-current-preview.vercel.app",
    };
    assert.deepEqual(getTrustedOrigins(true, env), [
      "https://dealer-current-preview.vercel.app",
    ]);
    assert.deepEqual(
      getTrustedOrigins(true, {
        ...env,
        VERCEL_URL: "dealer.vercel.app/other",
      }),
      [],
    );
    assert.deepEqual(
      getTrustedOrigins(true, { ...env, VERCEL_URL: undefined }),
      [],
    );
  });
});
