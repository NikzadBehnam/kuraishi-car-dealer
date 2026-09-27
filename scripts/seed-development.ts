import "dotenv/config";

import process from "node:process";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client.ts";
import { vehicles } from "../src/data/vehicles.ts";
import {
  buildDevelopmentVehicleSeed,
  readDevelopmentSeedConfig,
} from "../src/lib/development-seed.ts";

async function main() {
  const config = readDevelopmentSeedConfig(process.env);

  if (!config.ok) {
    console.error("Development catalogue import was refused.");
    for (const issue of config.issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.databaseUrl }),
  });
  const records = buildDevelopmentVehicleSeed(vehicles);

  try {
    await prisma.$transaction(
      async (transaction) => {
        for (const record of records) {
          const { id, ...vehicleData } = record.vehicle;
          const persistedVehicle = await transaction.vehicle.upsert({
            where: { stockNumber: vehicleData.stockNumber },
            create: { id, ...vehicleData },
            update: vehicleData,
            select: { id: true },
          });

          await transaction.mediaAsset.updateMany({
            where: {
              provider: "development",
              vehicleId: persistedVehicle.id,
            },
            data: {
              position: null,
              vehicleId: null,
            },
          });

          for (const image of record.images) {
            const { id: imageId, ...imageData } = image;
            const persistedImageData = {
              ...imageData,
              vehicleId: persistedVehicle.id,
            };

            await transaction.mediaAsset.upsert({
              where: {
                provider_providerAssetId: {
                  provider: image.provider,
                  providerAssetId: image.providerAssetId,
                },
              },
              create: { id: imageId, ...persistedImageData },
              update: persistedImageData,
            });
          }
        }
      },
      { timeout: 30_000 },
    );

    console.info(
      `Imported ${records.length} development vehicles and ${records.reduce((count, record) => count + record.images.length, 0)} ordered images.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Development catalogue import failed.");

  if (error instanceof Error) {
    console.error(error.message);
  }

  process.exitCode = 1;
});
