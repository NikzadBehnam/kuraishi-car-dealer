import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  addAdminInquiryNoteSchema,
  MAX_ADMIN_INQUIRY_NOTE_LENGTH,
} from "./admin-inquiry-validation.ts";

describe("admin inquiry note input", () => {
  it("trims valid note content and accepts multiline text", () => {
    assert.deepEqual(
      addAdminInquiryNoteSchema.parse({
        inquiryId: "cm123safe",
        content: "  Call back after 3pm.\nConfirm the vehicle is available.  ",
      }),
      {
        inquiryId: "cm123safe",
        content: "Call back after 3pm.\nConfirm the vehicle is available.",
      },
    );
  });

  it("rejects empty, oversized, malformed, control-character, and extra fields", () => {
    const invalidInputs = [
      { inquiryId: "cm123safe", content: " \n " },
      {
        inquiryId: "cm123safe",
        content: "x".repeat(MAX_ADMIN_INQUIRY_NOTE_LENGTH + 1),
      },
      { inquiryId: "../inquiry", content: "A valid note." },
      { inquiryId: "cm123safe", content: "Bad\u0000note" },
      { inquiryId: "cm123safe", content: "A valid note.", authorId: "forged" },
    ];

    for (const input of invalidInputs) {
      assert.equal(addAdminInquiryNoteSchema.safeParse(input).success, false);
    }
  });
});
