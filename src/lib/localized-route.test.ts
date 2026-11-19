import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getLocalizedRouteChange } from "./localized-route.ts";

describe("localized route changes", () => {
  it("rewrites dotted German vehicle slugs and preserves query parameters", () => {
    const result = getLocalizedRouteChange(
      new URL(
        "https://www.kuraishicars.com/fahrzeuge/volkswagen-id.4-17?source=search",
      ),
    );

    assert.equal(result?.kind, "rewrite");
    assert.equal(
      result?.url.href,
      "https://www.kuraishicars.com/vehicles/volkswagen-id.4-17?source=search",
    );
  });

  it("redirects direct English vehicle URLs and preserves query parameters", () => {
    const result = getLocalizedRouteChange(
      new URL(
        "https://www.kuraishicars.com/vehicles/volkswagen-id.4-17?source=search",
      ),
    );

    assert.equal(result?.kind, "redirect");
    assert.equal(
      result?.url.href,
      "https://www.kuraishicars.com/fahrzeuge/volkswagen-id.4-17?source=search",
    );
  });

  it("preserves service context when localizing the contact route", () => {
    const result = getLocalizedRouteChange(
      new URL("https://www.kuraishicars.com/kontakt?service=Werkstatt"),
    );

    assert.equal(result?.kind, "rewrite");
    assert.equal(
      result?.url.href,
      "https://www.kuraishicars.com/contact?service=Werkstatt",
    );
  });

  it("rewrites comparison routes and preserves selection context", () => {
    const result = getLocalizedRouteChange(
      new URL("https://www.kuraishicars.com/fahrzeugvergleich?source=header"),
    );

    assert.equal(result?.kind, "rewrite");
    assert.equal(
      result?.url.href,
      "https://www.kuraishicars.com/vehicle-comparison?source=header",
    );
  });
});
