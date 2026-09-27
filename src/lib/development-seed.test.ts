import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { vehicles } from "../data/vehicles.ts";
import { resourceIdSchema } from "../features/shared/schemas.ts";
import {
  buildDevelopmentVehicleSeed,
  developmentSeedConfirmation,
  readDevelopmentSeedConfig,
} from "./development-seed.ts";

describe("development catalogue seed", () => {
  it("requires explicit opt-in and refuses production environments", () => {
    assert.deepEqual(readDevelopmentSeedConfig({}), {
      issues: [
        `ALLOW_DEVELOPMENT_SEED must equal ${developmentSeedConfirmation}.`,
        "DIRECT_URL or DATABASE_URL must be set.",
      ],
      ok: false,
    });

    const production = readDevelopmentSeedConfig({
      ALLOW_DEVELOPMENT_SEED: developmentSeedConfirmation,
      DIRECT_URL: "postgresql://development.invalid/catalogue",
      NODE_ENV: "production",
    });

    assert.equal(production.ok, false);
    assert(
      !production.ok &&
        production.issues.includes(
          "Development catalogue import is disabled in production.",
        ),
    );
  });

  it("prefers the direct database URL for an explicitly approved import", () => {
    assert.deepEqual(
      readDevelopmentSeedConfig({
        ALLOW_DEVELOPMENT_SEED: developmentSeedConfirmation,
        DATABASE_URL: "postgresql://pooled.invalid/catalogue",
        DIRECT_URL: "postgresql://direct.invalid/catalogue",
        NODE_ENV: "development",
      }),
      {
        databaseUrl: "postgresql://direct.invalid/catalogue",
        ok: true,
      },
    );
  });

  it("builds stable vehicle records and zero-based image ordering", () => {
    const first = buildDevelopmentVehicleSeed(vehicles);
    const second = buildDevelopmentVehicleSeed(vehicles);

    assert.deepEqual(first, second);
    assert.equal(first.length, vehicles.length);
    assert.equal(first[0].vehicle.status, "available");
    assert.equal(first[2].vehicle.status, "reserved");
    assert.equal(first[3].vehicle.status, "draft");
    assert.equal(first[0].vehicle.priceCents, vehicles[0].price * 100);
    assert.equal(first[5].vehicle.slug, "skoda-octavia-6");
    assert.deepEqual(
      first[0].images.map(({ position }) => position),
      [0, 1, 2],
    );
    assert.equal(resourceIdSchema.parse(first[0].vehicle.id), first[0].vehicle.id);
    assert.equal(resourceIdSchema.parse(first[0].images[0].id), first[0].images[0].id);
  });
});
