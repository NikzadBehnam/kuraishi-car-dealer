import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toAdminAppointmentDto } from "./mappers.ts";

describe("admin appointment mapper", () => {
  it("serializes appointment dates and nullable relations", () => {
    const dto = toAdminAppointmentDto({
      id: "appointment-1",
      type: "test_drive",
      status: "requested",
      customerName: "Ada Lovelace",
      customerEmail: "ada@example.com",
      customerPhone: null,
      startsAt: new Date("2026-10-01T10:00:00.000Z"),
      endsAt: new Date("2026-10-01T10:45:00.000Z"),
      location: "Showroom",
      notes: null,
      cancellationReason: null,
      confirmedAt: null,
      completedAt: null,
      cancelledAt: null,
      lead: null,
      vehicle: null,
      assignedTo: null,
    });

    assert.equal(dto.startsAt, "2026-10-01T10:00:00.000Z");
    assert.equal(dto.endsAt, "2026-10-01T10:45:00.000Z");
    assert.equal(dto.vehicle, null);
  });
});
