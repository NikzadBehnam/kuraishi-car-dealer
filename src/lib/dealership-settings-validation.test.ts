import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getDealershipPhones } from "./dealership-phones.ts";
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

  it("accepts optional business details, blank input and stored null values", () => {
    const settings = dealershipSettingsFieldsSchema.parse({
      ...validSettings,
      phone2: "  +43 (1) 555-0101  ",
      phone3: " ",
      legalForm: "  Eingetragenes Einzelunternehmen (e.U.)  ",
      businessActivity: "  Gebrauchtwagen An- und Verkauf  ",
    });
    assert.equal(settings.phone2, "+43 (1) 555-0101");
    assert.equal(settings.phone3, "");
    assert.equal(settings.legalForm, "Eingetragenes Einzelunternehmen (e.U.)");
    assert.equal(settings.businessActivity, "Gebrauchtwagen An- und Verkauf");
    assert.equal(
      saveDealershipSettingsSchema.parse({
        ...settings,
        phone3: null,
        expectedVersion: 1,
      }).phone3,
      null,
    );
    assert.equal(
      dealershipSettingsFieldsSchema.safeParse({
        ...validSettings,
        phone3: "not a telephone",
      }).success,
      false,
    );
  });

  it("presents only distinct configured numbers in contact order", () => {
    assert.deepEqual(
      getDealershipPhones({
        phone: "+43 (1) 555-0101",
        phone2: "+4315550101",
        phone3: "+43 1 555 0102",
      }),
      [
        { label: "+43 (1) 555-0101", number: "+4315550101" },
        { label: "+43 1 555 0102", number: "+4315550102" },
      ],
    );
    assert.equal(
      getDealershipPhones({
        phone: "+43 1 555 0101",
        phone2: null,
        phone3: null,
      }).length,
      1,
    );
  });
});
