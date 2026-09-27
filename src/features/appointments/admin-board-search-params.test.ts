import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAdminAppointmentBoardHref,
  parseAdminAppointmentBoardSearchParams,
} from "./admin-board-search-params.ts";

describe("admin appointment board search params", () => {
  it("parses the selected date and list filters", () => {
    assert.deepEqual(
      parseAdminAppointmentBoardSearchParams(
        { date: "2026-10-02", page: "2", status: "confirmed" },
        new Date("2026-09-27T10:00:00.000Z"),
      ),
      {
        selectedDate: "2026-10-02",
        appointments: {
          page: 2,
          pageSize: 12,
          sortDirection: "asc",
          sortField: "startsAt",
          status: "confirmed",
        },
      },
    );
  });

  it("builds stable board pagination links", () => {
    const query = parseAdminAppointmentBoardSearchParams(
      { date: "2026-10-02", type: "valuation" },
      new Date("2026-09-27T10:00:00.000Z"),
    );
    assert.equal(
      buildAdminAppointmentBoardHref(query, 3),
      "/admin/appointments?date=2026-10-02&type=valuation&page=3",
    );
  });
});
