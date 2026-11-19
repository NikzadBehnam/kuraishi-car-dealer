import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { dealershipDate } from "./business-date.ts";
import {
  inquiryAppointmentTypes,
  inquiryFieldsSchema,
  inquiryServiceMapping,
  isValidInquiryDate,
  inquiryContactParamsSchema,
  inquirySubmissionSchema,
} from "./inquiry-validation.ts";

const validInquiry = {
  name: "Test Visitor",
  email: "visitor@example.invalid",
  appointmentType: "Beratung",
  message: "Synthetic inquiry.\nPlease contact me.",
  consent: true,
};

describe("inquiry validation", () => {
  it("allows calendar-valid dates in retry envelopes but rejects past dates for new intake", () => {
    const fields = { ...validInquiry, preferredDate: "2000-01-01" };
    const envelope = {
      fields,
      requestId: "e71518aa-d484-4fb9-8fad-9770520836b0",
      vehicleSlug: null,
      website: "",
      privacyNoticeVersion: "previous-notice",
    };
    assert.equal(inquirySubmissionSchema.safeParse(envelope).success, true);
    assert.equal(inquiryFieldsSchema.safeParse(fields).success, false);
    assert.equal(
      inquirySubmissionSchema.safeParse({
        ...envelope,
        fields: { ...fields, preferredDate: "2000-02-30" },
      }).success,
      false,
    );
  });
  it("accepts only well-formed single vehicle/service URL contexts", () => {
    assert.deepEqual(inquiryContactParamsSchema.parse({}), {});
    assert.deepEqual(
      inquiryContactParamsSchema.parse({
        vehicle: "example-car",
        service: "Werkstatt",
      }),
      { vehicle: "example-car", service: "Werkstatt" },
    );
    for (const context of [
      { vehicle: ["car-a", "car-b"] },
      { service: ["Beratung", "Werkstatt"] },
      { vehicle: "../private" },
      { vehicle: "" },
      { service: "forged-service" },
    ]) {
      assert.equal(
        inquiryContactParamsSchema.safeParse(context).success,
        false,
      );
    }
  });
  it("accepts every approved service with distinct, server-derived source labels", () => {
    const expected = [
      ["test_drive", "test_drive"],
      ["consultation", "contact"],
      ["vehicle_valuation", "contact"],
      ["workshop", "contact"],
      ["callback", "callback"],
    ];
    inquiryAppointmentTypes.forEach((appointmentType, index) => {
      const parsed = inquiryFieldsSchema.parse({
        ...validInquiry,
        appointmentType,
        name: "  Test Visitor  ",
        email: "  visitor@example.invalid ",
        phone: " +43 664 123 45 67 ",
        preferredDate: "",
      });
      assert.equal(parsed.name, "Test Visitor");
      assert.equal(parsed.email, "visitor@example.invalid");
      assert.equal(parsed.phone, "+43 664 123 45 67");
      const { requestedService, source } =
        inquiryServiceMapping[parsed.appointmentType];
      assert.deepEqual([requestedService, source], expected[index]);
    });
    assert.equal(inquiryFieldsSchema.safeParse(validInquiry).success, true);
    assert.equal(
      inquiryFieldsSchema.safeParse({
        ...validInquiry,
        phone: "",
        preferredDate: "",
      }).success,
      true,
    );
  });

  it("rejects forged fields, invalid contacts, missing consent and oversized text", () => {
    for (const change of [
      { name: "x" },
      { name: "x".repeat(201) },
      { name: "First\nForged header" },
      { email: "invalid" },
      { email: `${"x".repeat(244)}@example.com` },
      { phone: "123" },
      { phone: "call me" },
      { phone: "+1234567890123456" },
      { appointmentType: "not-an-approved-service" },
      { consent: false },
      { consent: undefined },
      { message: "x".repeat(1001) },
      { message: "message\u0000payload" },
      { source: "callback" },
      { requestedService: "callback" },
      { vehicleId: "forged" },
      { vehicleTitleSnapshot: "forged" },
      { privacyNoticeVersion: "forged" },
      { privacyAcknowledgedAt: "2026-01-01T00:00:00Z" },
    ]) {
      assert.equal(
        inquiryFieldsSchema.safeParse({ ...validInquiry, ...change }).success,
        false,
        `Unexpectedly accepted fields: ${Object.keys(change).join(", ")}`,
      );
    }
    assert.equal(
      inquiryFieldsSchema.safeParse({
        ...validInquiry,
        message: "x".repeat(1000),
      }).success,
      true,
    );
  });

  it("checks calendar validity and Vienna business dates across midnight and DST", () => {
    const winterMidnight = new Date("2026-11-18T23:00:00Z");
    const summerMidnight = new Date("2026-07-18T22:00:00Z");
    assert.equal(dealershipDate(winterMidnight), "2026-11-19");
    assert.equal(dealershipDate(summerMidnight), "2026-07-19");
    assert.equal(isValidInquiryDate("2026-11-18", winterMidnight), false);
    assert.equal(isValidInquiryDate("2026-11-19", winterMidnight), true);
    assert.equal(
      isValidInquiryDate("2026-11-18", new Date("2026-11-18T22:59:59Z")),
      true,
    );
    assert.equal(isValidInquiryDate("2026-11-21", winterMidnight), true);
    assert.equal(isValidInquiryDate("2026-11-22", winterMidnight), true);
    assert.equal(isValidInquiryDate("2026-07-18", summerMidnight), false);
    assert.equal(isValidInquiryDate("2026-07-19", summerMidnight), true);

    const leapYear = new Date("2028-02-28T12:00:00Z");
    assert.equal(isValidInquiryDate("2028-02-29", leapYear), true);
    for (const value of [
      "2029-02-29",
      "2028-02-30",
      "2028-04-31",
      "2028-2-29",
      "2028-02-29T00:00:00Z",
      "",
    ]) {
      assert.equal(isValidInquiryDate(value, leapYear), false);
    }
    for (const instant of [
      "2027-03-28T00:59:59Z",
      "2027-03-28T01:00:00Z",
      "2027-10-31T00:59:59Z",
      "2027-10-31T01:00:00Z",
    ]) {
      const now = new Date(instant);
      assert.equal(isValidInquiryDate(dealershipDate(now), now), true);
    }
  });

  it("validates optional dates through the shared form/server schema", () => {
    assert.equal(
      inquiryFieldsSchema.safeParse({
        ...validInquiry,
        preferredDate: dealershipDate(),
      }).success,
      true,
    );
    for (const value of [
      "2000-01-01",
      "2029-02-29",
      "tomorrow",
      "2028-13-01",
    ]) {
      assert.equal(
        inquiryFieldsSchema.safeParse({
          ...validInquiry,
          preferredDate: value,
        }).success,
        false,
      );
    }
  });
});
