import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { actionFailure, actionSuccess } from "./action-result.ts";
import {
  booleanQuerySchema,
  idListSchema,
  normalizeEmail,
  normalizeMultilineText,
  normalizeSlug,
  normalizeStringList,
  normalizeWhitespace,
  paginationQuerySchema,
  resourceIdSchema,
} from "./schemas.ts";

describe("shared domain contracts", () => {
  it("normalizes reusable text formats", () => {
    assert.equal(normalizeWhitespace("  Kuraishi   Cars  "), "Kuraishi Cars");
    assert.equal(normalizeEmail("  OWNER@Example.COM "), "owner@example.com");
    assert.equal(normalizeSlug("  Audi A6 Avant — Quattro "), "audi-a6-avant-quattro");
    assert.equal(
      normalizeMultilineText(" First line \r\n\r\n\r\n Second line "),
      "First line\n\nSecond line",
    );
    assert.deepEqual(
      normalizeStringList([" Heated seats ", "Heated seats", "", "Camera"]),
      ["Heated seats", "Camera"],
    );
  });

  it("applies bounded pagination defaults and rejects invalid bounds", () => {
    assert.deepEqual(paginationQuerySchema.parse({}), {
      page: 1,
      pageSize: 20,
    });
    assert.deepEqual(
      paginationQuerySchema.parse({ page: "3", pageSize: "40" }),
      { page: 3, pageSize: 40 },
    );
    assert.equal(
      paginationQuerySchema.safeParse({ page: 0, pageSize: 20 }).success,
      false,
    );
    assert.equal(
      paginationQuerySchema.safeParse({ page: 1, pageSize: 101 }).success,
      false,
    );
  });

  it("accepts explicit query booleans only", () => {
    assert.equal(booleanQuerySchema.parse("true"), true);
    assert.equal(booleanQuerySchema.parse("0"), false);
    assert.equal(booleanQuerySchema.safeParse("yes").success, false);
  });

  it("validates business IDs and deduplicates bounded ID lists", () => {
    const id = "ck9h7d0x00000qzrmn831i7rn";

    assert.equal(resourceIdSchema.parse(id), id);
    assert.deepEqual(idListSchema.parse([id, id]), [id]);
    assert.equal(resourceIdSchema.safeParse("vehicle-1").success, false);
  });

  it("creates discriminated action results", () => {
    assert.deepEqual(actionSuccess({ id: "vehicle-1" }), {
      data: { id: "vehicle-1" },
      ok: true,
    });
    assert.deepEqual(
      actionFailure("VALIDATION_ERROR", "Check the submitted fields.", {
        make: ["Make is required."],
      }),
      {
        error: {
          code: "VALIDATION_ERROR",
          fieldErrors: { make: ["Make is required."] },
          message: "Check the submitted fields.",
        },
        ok: false,
      },
    );
  });
});
