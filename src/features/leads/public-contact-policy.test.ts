import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPublicContactLeadMessage,
  isPreferredContactDateInPast,
  parsePreferredContactDate,
  resolvePublicContactLeadSource,
} from "./public-contact-policy.ts";
import { publicContactLeadSubmissionSchema } from "./schemas.ts";

describe("public contact lead policy", () => {
  it("normalizes and validates a public contact request", () => {
    assert.deepEqual(
      publicContactLeadSubmissionSchema.parse({
        appointmentType: "consultation",
        consent: true,
        email: "  CUSTOMER@Example.COM ",
        message: "  Please call me.  ",
        name: "  Ada   Lovelace ",
        phone: "  +43 664 123 45 67 ",
        preferredDate: "2026-10-15",
        website: "",
      }),
      {
        appointmentType: "consultation",
        consent: true,
        email: "customer@example.com",
        message: "Please call me.",
        name: "Ada Lovelace",
        phone: "+43 664 123 45 67",
        preferredDate: "2026-10-15",
        website: "",
      },
    );
  });

  it("rejects missing consent, invalid dates, and filled honeypots", () => {
    const validInput = {
      appointmentType: "consultation",
      consent: true,
      email: "customer@example.com",
      message: "Please call me.",
      name: "Ada Lovelace",
      phone: "",
      preferredDate: "2026-10-15",
      website: "",
    } as const;

    assert.equal(
      publicContactLeadSubmissionSchema.safeParse({
        ...validInput,
        consent: false,
      }).success,
      false,
    );
    assert.equal(
      publicContactLeadSubmissionSchema.safeParse({
        ...validInput,
        preferredDate: "15-10-2026",
      }).success,
      false,
    );
    assert.equal(
      publicContactLeadSubmissionSchema.safeParse({
        ...validInput,
        website: "https://spam.example",
      }).success,
      false,
    );
  });

  it("maps appointment intent to canonical lead sources", () => {
    assert.equal(resolvePublicContactLeadSource("test_drive"), "test-drive");
    assert.equal(resolvePublicContactLeadSource("valuation"), "valuation");
    assert.equal(resolvePublicContactLeadSource("callback"), "callback");
    assert.equal(resolvePublicContactLeadSource("consultation"), "contact");
    assert.equal(resolvePublicContactLeadSource("workshop"), "contact");
  });

  it("preserves appointment intent in the message and date", () => {
    assert.equal(
      buildPublicContactLeadMessage({
        appointmentType: "workshop",
        message: "Winter tyres",
      }),
      "Appointment type: Workshop\n\nWinter tyres",
    );
    assert.equal(
      parsePreferredContactDate("2026-10-15").toISOString(),
      "2026-10-15T12:00:00.000Z",
    );
    assert.equal(
      isPreferredContactDateInPast(
        "2026-09-26",
        new Date("2026-09-27T08:00:00.000Z"),
      ),
      true,
    );
    assert.equal(
      isPreferredContactDateInPast(
        "2026-09-27",
        new Date("2026-09-27T08:00:00.000Z"),
      ),
      false,
    );
  });
});
