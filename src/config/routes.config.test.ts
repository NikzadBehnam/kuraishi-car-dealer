import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  internalRoutes,
  localizedRouteMappings,
  publicRoutes,
  routeBuilders,
} from "./routes.config.ts";

describe("localized route configuration", () => {
  it("keeps German public URLs separate from English physical routes", () => {
    assert.equal(publicRoutes.vehicles, "/fahrzeuge");
    assert.equal(internalRoutes.vehicles, "/vehicles");
    assert.deepEqual(
      localizedRouteMappings.find((route) => route.key === "vehicles"),
      {
        key: "vehicles",
        publicPath: "/fahrzeuge",
        internalPath: "/vehicles",
      },
    );
  });

  it("builds the canonical German vehicle path", () => {
    assert.equal(
      routeBuilders.vehicleDetails("bmw-x3-example"),
      "/fahrzeuge/bmw-x3-example",
    );
  });
});
