import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getInitials,
  getSessionDisplayName,
  getSessionSubtitle,
} from "./session-display.ts";

describe("session display helpers", () => {
  it("formats user labels without exposing empty values", () => {
    assert.equal(getSessionDisplayName({ name: " Ada   Lovelace " }), "Ada Lovelace");
    assert.equal(getSessionDisplayName(null), "Client account");
    assert.equal(getSessionSubtitle({ email: "ada@example.com" }), "ada@example.com");
    assert.equal(getSessionSubtitle({}), "Signed in");
  });

  it("builds stable initials", () => {
    assert.equal(getInitials("Ada Lovelace"), "AL");
    assert.equal(getInitials("Ada"), "A");
    assert.equal(getInitials(""), "KA");
  });
});
