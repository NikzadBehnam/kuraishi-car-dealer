import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canTransitionAppointmentStatus,
  resolveAppointmentLifecycleDates,
} from "./lifecycle-policy.ts";

describe("appointment lifecycle policy", () => {
  it("allows only active lifecycle transitions", () => {
    assert.equal(
      canTransitionAppointmentStatus("requested", "confirmed"),
      true,
    );
    assert.equal(
      canTransitionAppointmentStatus("confirmed", "completed"),
      true,
    );
    assert.equal(
      canTransitionAppointmentStatus("requested", "completed"),
      false,
    );
    assert.equal(
      canTransitionAppointmentStatus("cancelled", "confirmed"),
      false,
    );
  });

  it("stamps lifecycle dates deterministically", () => {
    const now = new Date("2026-09-27T10:00:00.000Z");
    assert.deepEqual(
      resolveAppointmentLifecycleDates(
        { cancelledAt: null, completedAt: null, confirmedAt: null },
        "confirmed",
        now,
      ),
      { cancelledAt: null, completedAt: null, confirmedAt: now },
    );
  });
});
