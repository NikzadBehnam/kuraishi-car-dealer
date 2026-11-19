import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  AdminInquiryDetailQueryRow,
  AdminInquiryQueryRow,
} from "./admin-inquiry-dto.ts";
import {
  serializeAdminInquiryDetail,
  serializeAdminInquiryListItem,
} from "./admin-inquiry-dto.ts";

const inquiry: AdminInquiryDetailQueryRow = {
  id: "cm123safe",
  source: "test_drive",
  requestedService: "test_drive",
  customerName: "Synthetic Staff Test",
  customerEmail: "synthetic@example.invalid",
  customerPhone: null,
  vehicleId: null,
  vehicleTitleSnapshot: "Example Model Snapshot",
  vehicleSlugSnapshot: "example-model",
  createdAt: new Date("2026-11-19T10:00:00.000Z"),
  updatedAt: new Date("2026-11-19T10:05:00.000Z"),
  message: "Synthetic inquiry message.",
  preferredDate: new Date("2026-11-20T00:00:00.000Z"),
  vehicle: null,
  notification: {
    status: "failed",
    attemptCount: 5,
    lastErrorCode: "provider_unavailable",
    nextAttemptAt: new Date("2026-11-19T12:00:00.000Z"),
    sentAt: null,
  },
};

describe("admin inquiry DTOs", () => {
  it("maps source/service and keeps a historical vehicle snapshot without a live relation", () => {
    const result = serializeAdminInquiryListItem(inquiry);
    assert.equal(result.source, "test-drive");
    assert.equal(result.requestedService, "Test drive");
    assert.equal(result.vehicle, null);
    assert.equal(result.vehicleTitleSnapshot, "Example Model Snapshot");
    assert.equal(result.vehicleSlugSnapshot, "example-model");
    assert.equal(result.deliveryStatus, "failed");
    assert.equal("message" in result, false);
  });

  it("shows failed delivery details with allowlisted codes and exact business dates", () => {
    const result = serializeAdminInquiryDetail(inquiry);
    assert.equal(result.preferredDate, "2026-11-20");
    assert.equal(result.delivery?.lastErrorCode, "provider_unavailable");
    assert.equal(result.delivery?.attemptCount, 5);
    assert.equal(result.message, inquiry.message);
  });

  it("treats pre-outbox inquiries as untracked and rejects invalid stored error codes", () => {
    const legacy = {
      ...inquiry,
      notification: null,
    } satisfies AdminInquiryQueryRow;
    assert.equal(
      serializeAdminInquiryListItem(legacy).deliveryStatus,
      "untracked",
    );
    assert.throws(
      () =>
        serializeAdminInquiryDetail({
          ...inquiry,
          notification: {
            ...inquiry.notification!,
            lastErrorCode: "private provider response",
          },
        }),
      /Stored inquiry notification error code is invalid/,
    );
  });
});
