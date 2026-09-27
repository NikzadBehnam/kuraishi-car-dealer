import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildValuationLeadMessage,
  describeValuationAccidentHistory,
  describeValuationCondition,
  describeValuationServiceHistory,
  isValuationFirstRegistrationInFuture,
  parseValuationFirstRegistration,
} from "./public-valuation-policy.ts";
import { publicVehicleValuationSubmissionSchema } from "./schemas.ts";

const validSubmission = {
  accidentHistory: "accident_free",
  condition: "very_good",
  consent: true,
  email: "  CUSTOMER@Example.COM ",
  firstRegistration: "2021-04",
  make: "  Mercedes-Benz ",
  mileage: 42_000,
  model: " C  200 ",
  name: "  Ada   Lovelace ",
  phone: "  +43 664 123 45 67 ",
  serviceHistory: "complete",
  website: "",
} as const;

describe("public vehicle valuation policy", () => {
  it("normalizes and validates a valuation submission", () => {
    assert.deepEqual(
      publicVehicleValuationSubmissionSchema.parse(validSubmission),
      {
        ...validSubmission,
        email: "customer@example.com",
        make: "Mercedes-Benz",
        model: "C 200",
        name: "Ada Lovelace",
        phone: "+43 664 123 45 67",
      },
    );
  });

  it("rejects invalid mileage, registration months, consent, and honeypots", () => {
    for (const input of [
      { ...validSubmission, mileage: -1 },
      { ...validSubmission, firstRegistration: "2021-13" },
      { ...validSubmission, consent: false },
      { ...validSubmission, website: "https://spam.example" },
    ]) {
      assert.equal(
        publicVehicleValuationSubmissionSchema.safeParse(input).success,
        false,
      );
    }
  });

  it("maps valuation answers to stable database descriptions", () => {
    assert.equal(describeValuationCondition("wear"), "Signs of use");
    assert.equal(
      describeValuationAccidentHistory("repaired_damage"),
      "Repaired damage",
    );
    assert.equal(describeValuationServiceHistory("complete"), "Complete");
  });

  it("parses registration months and rejects future months", () => {
    assert.equal(
      parseValuationFirstRegistration("2021-04").toISOString(),
      "2021-04-01T00:00:00.000Z",
    );
    assert.equal(
      isValuationFirstRegistrationInFuture(
        "2026-10",
        new Date("2026-09-27T08:00:00.000Z"),
      ),
      true,
    );
    assert.equal(
      isValuationFirstRegistrationInFuture(
        "2026-09",
        new Date("2026-09-27T08:00:00.000Z"),
      ),
      false,
    );
    assert.equal(
      buildValuationLeadMessage("BMW", "320d"),
      "Vehicle valuation requested for BMW 320d.",
    );
  });
});
