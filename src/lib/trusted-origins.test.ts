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
});
