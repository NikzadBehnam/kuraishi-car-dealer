import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  appointmentListQuerySchema,
  appointmentStatusSchema,
  appointmentTypeSchema,
  appointmentWindowSchema,
} from "./schemas.ts";

describe("appointment contracts", () => {
  it("accepts only approved type and status values", () => {
    assert.equal(appointmentTypeSchema.parse("test_drive"), "test_drive");
    assert.equal(appointmentStatusSchema.parse("confirmed"), "confirmed");
    assert.equal(appointmentTypeSchema.safeParse("delivery").success, false);
    assert.equal(appointmentStatusSchema.safeParse("no_show").success, false);
  });

  it("requires an appointment to end after it starts", () => {
    assert.equal(
      appointmentWindowSchema.safeParse({
        endsAt: "2026-09-26T11:00:00.000Z",
        startsAt: "2026-09-26T10:00:00.000Z",
      }).success,
      true,
    );
    assert.equal(
      appointmentWindowSchema.safeParse({
        endsAt: "2026-09-26T10:00:00.000Z",
        startsAt: "2026-09-26T10:00:00.000Z",
      }).success,
      false,
    );
  });

  it("validates appointment date ranges and sort allowlists", () => {
    assert.equal(
      appointmentListQuerySchema.safeParse({
        from: "2026-09-27T00:00:00.000Z",
        to: "2026-09-26T00:00:00.000Z",
      }).success,
      false,
    );
    assert.equal(
      appointmentListQuerySchema.safeParse({ sortField: "customerEmail" })
        .success,
      false,
    );
  });
});
