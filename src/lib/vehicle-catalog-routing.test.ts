import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildPublicCatalogPageHref,
  buildPublicCatalogSearchHref,
} from "./vehicle-catalog-routing.ts";

describe("public catalog pagination URLs", () => {
  it("updates and clears the query while resetting pagination", () => {
    assert.equal(
      buildPublicCatalogSearchHref("  BMW X5  ", "q=Audi&page=3"),
      "/fahrzeuge?q=BMW+X5",
    );
    assert.equal(
      buildPublicCatalogSearchHref("", "q=BMW&page=2"),
      "/fahrzeuge",
    );
  });

  it("omits default parameters and preserves a search across pages", () => {
    assert.equal(buildPublicCatalogPageHref("", 1), "/fahrzeuge");
    assert.equal(
      buildPublicCatalogPageHref("BMW X5", 2),
      "/fahrzeuge?q=BMW+X5&page=2",
    );
  });

  it("URL-encodes German search terms and rejects invalid pages", () => {
    assert.equal(
      buildPublicCatalogPageHref("Ä Ö", 3),
      "/fahrzeuge?q=%C3%84+%C3%96&page=3",
    );
    assert.throws(() => buildPublicCatalogPageHref("", 0), RangeError);
  });
});
