import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdminLeadStatusCounts,
  toAdminLeadActivityDto,
  toAdminLeadDto,
} from "./mappers.ts";

const lead = {
  id: "lead-1",
  source: "test_drive" as const,
  status: "new" as const,
  priority: "high" as const,
  customerName: "Ada Lovelace",
  customerEmail: "ada@example.com",
  customerPhone: null,
  message: null,
  preferredDate: new Date("2026-10-15T12:00:00.000Z"),
  createdAt: new Date("2026-09-27T08:00:00.000Z"),
  updatedAt: new Date("2026-09-27T09:00:00.000Z"),
  assignedTo: null,
  vehicle: null,
  valuationRequest: {
    accidentHistory: "Accident-free",
    conditionDescription: "Very good",
    firstRegistration: new Date("2021-04-01T00:00:00.000Z"),
    make: "BMW",
    mileage: 42_000,
    model: "320d",
    serviceHistory: "Complete",
  },
  _count: { notes: 2 },
};

describe("admin lead mappers", () => {
  it("maps database lead values to a serializable admin DTO", () => {
    const dto = toAdminLeadDto(lead);

    assert.equal(dto.source, "test-drive");
    assert.equal(dto.preferredDate, "2026-10-15T12:00:00.000Z");
    assert.equal(dto.valuationRequest?.firstRegistration, "2021-04");
    assert.equal(dto.noteCount, 2);
    assert.equal(dto.message, null);
  });

  it("serializes lead activity timestamps", () => {
    assert.deepEqual(
      toAdminLeadActivityDto({
        id: "event-1",
        occurredAt: new Date("2026-09-27T08:01:00.000Z"),
        summary: "Lead created",
        targetId: "lead-1",
        targetLabel: "Ada Lovelace",
      }),
      {
        id: "event-1",
        occurredAt: "2026-09-27T08:01:00.000Z",
        summary: "Lead created",
        targetLabel: "Ada Lovelace",
      },
    );
  });

  it("fills every status count and computes the all count", () => {
    assert.deepEqual(
      buildAdminLeadStatusCounts([
        { status: "new", _count: { _all: 3 } },
        { status: "closed", _count: { _all: 2 } },
      ]),
      {
        all: 5,
        closed: 2,
        contacted: 0,
        lost: 0,
        new: 3,
        qualified: 0,
      },
    );
  });
});
