import { z } from "zod";

import { vehicles } from "../src/data/vehicles.ts";
import { Prisma } from "../src/generated/prisma/client.ts";
import { inventoryIdSchema } from "../src/lib/inventory-validation.ts";

export const inventoryFixtureInputSchema = z.strictObject({
  actorId: inventoryIdSchema,
  dealerId: inventoryIdSchema,
  acquiredOn: z.iso.date(),
  mode: z.enum(["preview", "apply"]).default("preview"),
});

export const inventoryFixtures = vehicles.map((vehicle) => {
  const key = vehicle.id.padStart(3, "0");
  return {
    id: `dev-fixture-vehicle-${key}`,
    stockNumber: `DEV-FIXTURE-${key}`,
    slug: `dev-fixture-${vehicle.slug}`,
    make: vehicle.make,
    model: vehicle.model,
    variant: vehicle.variant,
    description: vehicle.description,
    price: new Prisma.Decimal(vehicle.price.toString()),
    firstRegistration: vehicle.firstRegistration,
    mileage: vehicle.mileage,
    powerKw: new Prisma.Decimal(vehicle.powerKw.toString()),
    fuelType: vehicle.fuelType,
    transmissionType: vehicle.transmissionType,
    bodyType: vehicle.bodyType,
    exteriorColor: vehicle.exteriorColor,
    condition: vehicle.condition,
    // Legacy consumption has no declared unit, so neither value nor unit is imported.
    co2Emission: vehicle.co2Emission ?? null,
    features: [...vehicle.features],
    labels: [...vehicle.labels],
    location: vehicle.location,
    status: "draft",
    inspectionStatus: "pending",
    isFeatured: false,
  } satisfies Omit<
    Prisma.VehicleCreateManyInput,
    "dealerId" | "createdById" | "updatedById" | "acquisitionDate"
  >;
});

const initialChangeId = (id: string) => `${id}-initial-v1`;

// The caller owns a Serializable transaction; this function never updates or deletes records.
export async function importInventoryFixtures(
  tx: Pick<
    Prisma.TransactionClient,
    "user" | "dealer" | "vehicle" | "vehicleChange"
  >,
  input: unknown,
) {
  const { actorId, dealerId, acquiredOn, mode } =
    inventoryFixtureInputSchema.parse(input);
  const [actor, dealer] = await Promise.all([
    tx.user.findUnique({
      where: { id: actorId },
      select: { id: true, banned: true },
    }),
    tx.dealer.findUnique({ where: { id: dealerId }, select: { id: true } }),
  ]);
  if (!actor || actor.banned) {
    throw new Error(
      "Fixture import requires an existing, unbanned staff actor; accounts are never created.",
    );
  }
  if (!dealer) {
    throw new Error(
      "Fixture import requires an existing dealership; dealership data is never created or replaced.",
    );
  }

  const fixtureIds = inventoryFixtures.map(({ id }) => id);
  const [existing, initialChanges] = await Promise.all([
    tx.vehicle.findMany({
      where: {
        OR: [
          { id: { in: fixtureIds } },
          {
            stockNumber: {
              in: inventoryFixtures.map(({ stockNumber }) => stockNumber),
            },
          },
          { slug: { in: inventoryFixtures.map(({ slug }) => slug) } },
        ],
      },
      select: {
        id: true,
        stockNumber: true,
        slug: true,
        dealerId: true,
        createdById: true,
      },
    }),
    tx.vehicleChange.findMany({
      where: { id: { in: fixtureIds.map(initialChangeId) } },
    }),
  ]);
  const byId = new Map(existing.map((row) => [row.id, row]));
  const changesById = new Map(initialChanges.map((row) => [row.id, row]));

  for (const row of existing) {
    const change = changesById.get(initialChangeId(row.id));
    if (
      !fixtureIds.includes(row.id) ||
      row.dealerId !== dealerId ||
      !change ||
      change.vehicleId !== row.id ||
      change.actorId !== row.createdById ||
      change.version !== 1 ||
      change.previousStatus !== null ||
      change.status !== "draft" ||
      change.previousInspectionStatus !== null ||
      change.inspectionStatus !== "pending" ||
      change.previousSoldAt !== null ||
      change.soldAt !== null
    ) {
      throw new Error(
        "Fixture identifiers overlap unrelated inventory or invalid import history. No fixtures were imported.",
      );
    }
  }
  for (const fixture of inventoryFixtures) {
    const stockOwner = existing.find(
      (row) => row.stockNumber === fixture.stockNumber,
    );
    const slugOwner = existing.find((row) => row.slug === fixture.slug);
    if (
      (stockOwner && stockOwner.id !== fixture.id) ||
      (slugOwner && slugOwner.id !== fixture.id) ||
      (!byId.has(fixture.id) && changesById.has(initialChangeId(fixture.id)))
    ) {
      throw new Error(
        "Fixture stock, slug or history identifiers conflict. No fixtures were imported.",
      );
    }
  }

  const missing = inventoryFixtures.filter(({ id }) => !byId.has(id));
  if (mode === "apply" && missing.length) {
    await tx.vehicle.createMany({
      data: missing.map((fixture) => ({
        ...fixture,
        dealerId,
        createdById: actorId,
        updatedById: actorId,
        acquisitionDate: new Date(`${acquiredOn}T00:00:00.000Z`),
      })),
    });
    await tx.vehicleChange.createMany({
      data: missing.map(({ id }) => ({
        id: initialChangeId(id),
        vehicleId: id,
        actorId,
        version: 1,
        status: "draft",
        inspectionStatus: "pending",
      })),
    });
  }
  return {
    mode,
    total: inventoryFixtures.length,
    skipped: inventoryFixtures.length - missing.length,
    wouldCreate: missing.length,
    created: mode === "apply" ? missing.length : 0,
  };
}
