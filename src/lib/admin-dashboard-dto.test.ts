import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  serializeAdminDashboardInquiry,
  type AdminDashboardInquiryQueryRow,
} from "./admin-dashboard-dto.ts";

const inquiry: AdminDashboardInquiryQueryRow = {
  id: "inquiry-1",
  source: "test_drive",
  customerName: "Synthetic Staff Test",
  customerEmail: "synthetic@example.invalid",
  createdAt: new Date("2026-11-19T10:00:00.000Z"),
  vehicleTitleSnapshot: "Historical Example Model",
  vehicle: {
    make: "Example",
    model: "Current Model",
    variant: "Touring",
  },
};

describe("admin dashboard inquiry DTO", () => {
  it("uses the current linked vehicle and maps the protected source", () => {
    assert.deepEqual(serializeAdminDashboardInquiry(inquiry), {
      id: "inquiry-1",
      source: "test-drive",
      customerName: "Synthetic Staff Test",
      customerEmail: "synthetic@example.invalid",
      createdAt: "2026-11-19T10:00:00.000Z",
      vehicleInterest: "Example Current Model Touring",
    });
  });

  it("preserves historical vehicle context without exposing unselected fields", () => {
    const result = serializeAdminDashboardInquiry({
      ...inquiry,
      vehicle: null,
    });
    assert.equal(result.vehicleInterest, "Historical Example Model");
    assert.equal("message" in result, false);
    assert.equal("customerPhone" in result, false);
  });
});
