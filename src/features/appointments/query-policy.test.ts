import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdminAppointmentOrderBy,
  buildAdminAppointmentWhere,
} from "./query-policy.ts";
import { appointmentListQuerySchema } from "./schemas.ts";

describe("admin appointment query policy", () => {
  it("builds date, status, type, and search filters", () => {
    const query = appointmentListQuerySchema.parse({
      from: "2026-10-01T00:00:00.000Z",
      search: "BMW",
      status: "confirmed",
      to: "2026-11-01T00:00:00.000Z",
      type: "test_drive",
    });
    const where = buildAdminAppointmentWhere(query);
    assert(Array.isArray(where.AND));
    assert.equal(where.AND.length, 5);
  });

  it("builds deterministic ordering", () => {
    const query = appointmentListQuerySchema.parse({
      sortDirection: "desc",
      sortField: "createdAt",
    });
    assert.deepEqual(buildAdminAppointmentOrderBy(query), [
      { createdAt: "desc" },
      { id: "desc" },
    ]);
  });
});
