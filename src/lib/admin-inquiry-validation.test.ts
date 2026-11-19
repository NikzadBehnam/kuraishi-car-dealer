import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adminInquirySearchParamsSchema,
  buildAdminInquiryDetailHref,
  buildAdminInquiriesHref,
  getAdminInquirySearchTerms,
} from "./admin-inquiry-validation.ts";

describe("admin inquiry search parameters", () => {
  it("defaults and bounds pagination and the search string", () => {
    assert.deepEqual(adminInquirySearchParamsSchema.parse({}), {
      q: "",
      page: 1,
    });
    assert.deepEqual(
      adminInquirySearchParamsSchema.parse({
        q: "  Max   Mustermann ",
        page: "2",
        lead: "cm123safe",
      }),
      { q: "Max   Mustermann", page: 2, lead: "cm123safe" },
    );
    assert.throws(() =>
      adminInquirySearchParamsSchema.parse({
        q: "x".repeat(101),
      }),
    );
    assert.throws(() =>
      adminInquirySearchParamsSchema.parse({
        q: "lead\u0000search",
      }),
    );
  });

  it("rejects repeated, unknown, malformed, and unsafe URL values", () => {
    for (const input of [
      { q: ["first", "second"] },
      { page: ["1", "2"] },
      { lead: "../private" },
      { page: "0" },
      { page: "-1" },
      { page: "1.5" },
      { page: "9007199254740991" },
      { unexpected: "value" },
    ]) {
      assert.throws(() => adminInquirySearchParamsSchema.parse(input));
    }
  });

  it("matches all normalized terms and builds stable pagination links", () => {
    assert.deepEqual(getAdminInquirySearchTerms("  MAX   Mustermann  "), [
      "max",
      "mustermann",
    ]);
    assert.equal(buildAdminInquiriesHref("", 1), "/admin/leads");
    assert.equal(
      buildAdminInquiryDetailHref("cm123safe"),
      "/admin/leads?lead=cm123safe",
    );
    assert.equal(
      buildAdminInquiriesHref("Müller & Sohn", 3),
      "/admin/leads?q=M%C3%BCller+%26+Sohn&page=3",
    );
  });
});
