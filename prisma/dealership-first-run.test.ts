import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { it, mock } from "node:test";

import { AuthorizationError } from "../src/lib/auth-access.ts";
import { createInventoryTestDatabase } from "./inventory-test-client.ts";

it("creates exactly one dealership on a fresh setup, then reads and updates it", async () => {
  const { prisma } = createInventoryTestDatabase();
  const shortName = `Synthetic ${randomUUID()}`;
  let signedIn = false;
  const dbMock = mock.module("../src/lib/db.ts", {
    namedExports: { prisma },
  });
  const sessionMock = mock.module("../src/lib/session.ts", {
    namedExports: {
      AuthorizationError,
      requireSession: async () => {
        if (!signedIn) throw new AuthorizationError(401, "Sign in first.");
      },
    },
  });
  const cacheMock = mock.module("next/cache", {
    namedExports: { revalidatePath: () => {} },
  });

  try {
    assert.equal(
      await prisma.dealer.count(),
      0,
      "Use an empty isolated test database.",
    );
    const { getAdminDealershipSettings, saveDealershipSettings } =
      await import("../src/lib/dealership-settings.ts");
    const fields = {
      name: "Synthetic dealership",
      shortName,
      tagline: "Test vehicles",
      websiteUrl: "https://dealership.example.invalid",
      description: "Synthetic fixture for first-run settings.",
      phone: "+1 202 555 0100",
      email: "fixture@example.invalid",
      street: "1 Test Street",
      postalCode: "00000",
      city: "Test City",
      country: "Test Country",
      mapUrl: "https://maps.google.com/?q=Test+City",
    };
    const firstSave = { ...fields, expectedVersion: null };
    await assert.rejects(getAdminDealershipSettings(), AuthorizationError);
    assert.equal((await saveDealershipSettings(firstSave)).ok, false);
    signedIn = true;
    assert.equal(await getAdminDealershipSettings(), null);
    assert.equal(
      (await saveDealershipSettings({ ...firstSave, name: "" })).ok,
      false,
    );
    assert.equal(await prisma.dealer.count(), 0);

    const results = await Promise.all([
      saveDealershipSettings(firstSave),
      saveDealershipSettings(firstSave),
    ]);
    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(
      results.filter((result) => !result.ok && result.kind === "conflict")
        .length,
      1,
    );
    assert.equal(await prisma.dealer.count(), 1);
    assert.deepEqual(await getAdminDealershipSettings(), {
      ...fields,
      version: 1,
    });

    const updated = await saveDealershipSettings({
      ...fields,
      name: "Updated synthetic dealership",
      expectedVersion: 1,
    });
    assert.ok(updated.ok);
    assert.deepEqual(await getAdminDealershipSettings(), {
      ...fields,
      name: "Updated synthetic dealership",
      version: 2,
    });
  } finally {
    try {
      await prisma.dealer.deleteMany({ where: { shortName } });
    } finally {
      dbMock.restore();
      sessionMock.restore();
      cacheMock.restore();
      await prisma.$disconnect();
    }
  }
});
