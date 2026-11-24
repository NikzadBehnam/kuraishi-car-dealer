import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dealershipSettingsFieldsSchema,
  saveDealershipSettingsSchema,
} from "./dealership-settings-validation.ts";

const validSettings = {
  name: "Kuraishi Autohandel e.U.",
  shortName: "Kuraishi",
  tagline: "Ihr Fahrzeug. Ihre Entscheidung.",
  websiteUrl: "https://www.kuraishi-autohandel.at",
  description:
    "Geprüfte Gebrauchtwagen, transparente Angebote und persönliche Beratung in Wien.",
  phone: "+43 676 989 0630",
  email: "office@example.com",
  street: "Treustraße 57/4/3",
  postalCode: "1200",
  city: "Wien",
  country: "Österreich",
  mapUrl: "https://maps.google.com/?q=Treustraße+57%2F4%2F3%2C+1200+Wien",
};

describe("dealership settings validation", () => {
  it("requires an explicit null version for first-run creation", () => {
    assert.equal(
      saveDealershipSettingsSchema.safeParse({
        ...validSettings,
        expectedVersion: null,
      }).success,
      true,
    );
    assert.equal(
      saveDealershipSettingsSchema.safeParse(validSettings).success,
      false,
    );
  });

  it("accepts trimmed public settings and a valid optimistic version", () => {
    assert.deepEqual(
      saveDealershipSettingsSchema.parse({
        ...validSettings,
        name: "  Kuraishi Autohandel e.U.  ",
        expectedVersion: 3,
      }),
      { ...validSettings, expectedVersion: 3 },
    );
  });

  it("rejects malformed contact values, unsafe URLs and invalid versions", () => {
    for (const settings of [
      { ...validSettings, email: "not-an-email" },
      { ...validSettings, phone: "call us" },
      { ...validSettings, websiteUrl: "not a URL" },
      { ...validSettings, websiteUrl: "javascript:alert(1)" },
      { ...validSettings, websiteUrl: "http://example.com" },
      { ...validSettings, websiteUrl: "https://user:pass@example.com" },
      { ...validSettings, mapUrl: "https://example.com/location" },
      { ...validSettings, mapUrl: "http://maps.google.com/" },
      { ...validSettings, mapUrl: "not a URL" },
      { ...validSettings, description: `safe\u0000unsafe` },
      { ...validSettings, name: "First line\nForged vCard field" },
      { ...validSettings, unknown: "not allowed" },
    ]) {
      assert.equal(
        dealershipSettingsFieldsSchema.safeParse(settings).success,
        false,
      );
    }

    assert.equal(
      saveDealershipSettingsSchema.safeParse({
        ...validSettings,
        expectedVersion: 0,
      }).success,
      false,
    );
  });

  it("rejects overlong public text before persistence", () => {
    assert.equal(
      dealershipSettingsFieldsSchema.safeParse({
        ...validSettings,
        tagline: "x".repeat(161),
      }).success,
      false,
    );
  });
});
