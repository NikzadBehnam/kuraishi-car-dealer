import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildGoogleAuthRequest,
  getGoogleAuthErrorMessage,
  googleAuthProvider,
} from "./google-auth-flow.ts";

describe("Google auth flow", () => {
  it("builds a Google social sign-in request without extra scopes", () => {
    const request = buildGoogleAuthRequest("/favourites?from=google");

    assert.deepEqual(request, {
      callbackURL: "/favourites?from=google",
      provider: googleAuthProvider,
    });
    assert.equal("scopes" in request, false);
  });

  it("sanitizes Google callback URLs", () => {
    assert.equal(
      buildGoogleAuthRequest("https://example.com/phishing").callbackURL,
      "/",
    );
    assert.equal(buildGoogleAuthRequest("//example.com").callbackURL, "/");
  });

  it("shows a specific account-linking error without exposing account state", () => {
    assert.equal(
      getGoogleAuthErrorMessage({ code: "account_not_linked" }),
      "Sign in with the method already connected to this email, then link Google from your account.",
    );
  });
});
