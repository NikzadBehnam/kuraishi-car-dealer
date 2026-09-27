import type { Vehicle } from "../types/vehicle.ts";
import { normalizeSlug } from "../features/shared/schemas.ts";

export const developmentSeedConfirmation = "IMPORT_MOCK_CATALOG";

type DevelopmentSeedEnvironment = Record<string, string | undefined>;

export type DevelopmentSeedConfigResult =
  | { databaseUrl: string; ok: true }
  | { issues: string[]; ok: false };

const vehicleStatusCycle = [
  "available",
  "available",
  "reserved",
  "draft",
  "sold",
  "archived",
] as const;

type DevelopmentVehicleStatus = (typeof vehicleStatusCycle)[number];
type DevelopmentInspectionStatus =
  | "pending"
  | "in_progress"
  | "passed";

export type DevelopmentVehicleSeedRecord = {
  vehicle: {
    acquisitionDate: Date;
    archivedAt: Date | null;
    bodyType: Vehicle["bodyType"];
    co2Emission: number | null;
    condition: Vehicle["condition"];
    consumption: number | null;
    createdAt: Date;
    description: string;
    exteriorColor: string;
    features: string[];
    firstRegistration: Date;
    fuelType: Vehicle["fuelType"];
    id: string;
    inspectionStatus: DevelopmentInspectionStatus;
    isFeatured: boolean;
    labels: string[];
    make: string;
    marginEstimateCents: number;
    mileage: number;
    model: string;
    ownerCount: number;
    powerKw: number;
    priceCents: number;
    publishedAt: Date | null;
    reservedAt: Date | null;
    reservedUntil: Date | null;
    slug: string;
    soldAt: Date | null;
    status: DevelopmentVehicleStatus;
    stockNumber: string;
    transmissionType: Vehicle["transmissionType"];
    updatedAt: Date;
    variant: string;
    vinLastSix: string;
  };
  images: Array<{
    altText: string;
    createdAt: Date;
    height: number;
    id: string;
    mimeType: string;
    originalFilename: string;
    position: number;
    provider: string;
    providerAssetId: string;
    sizeBytes: bigint;
    title: string;
    updatedAt: Date;
    url: string;
    vehicleId: string;
    width: number;
  }>;
};

export function readDevelopmentSeedConfig(
  env: DevelopmentSeedEnvironment,
): DevelopmentSeedConfigResult {
  const issues: string[] = [];
  const isProduction =
    env.NODE_ENV === "production" || env.VERCEL_ENV === "production";
  const databaseUrl = (env.DIRECT_URL ?? env.DATABASE_URL)?.trim();

  if (isProduction) {
    issues.push("Development catalogue import is disabled in production.");
  }

  if (env.ALLOW_DEVELOPMENT_SEED !== developmentSeedConfirmation) {
    issues.push(
      `ALLOW_DEVELOPMENT_SEED must equal ${developmentSeedConfirmation}.`,
    );
  }

  if (!databaseUrl) {
    issues.push("DIRECT_URL or DATABASE_URL must be set.");
  }

  return issues.length > 0
    ? { issues, ok: false }
    : { databaseUrl: databaseUrl as string, ok: true };
}

export function buildDevelopmentVehicleSeed(
  vehicles: readonly Vehicle[],
): DevelopmentVehicleSeedRecord[] {
  return vehicles.map((vehicle, index) => {
    const sequence = index + 1;
    const status = vehicleStatusCycle[index % vehicleStatusCycle.length];
    const id = createStableDevelopmentId("vehicle", sequence);
    const slug = normalizeSlug(`${vehicle.make}-${vehicle.model}-${sequence}`);
    const acquisitionDate = asUtcDate(
      `2026-06-${String((index % 22) + 1).padStart(2, "0")}`,
    );
    const updatedAt = new Date(
      `2026-08-${String((index % 4) + 1).padStart(2, "0")}T${String(10 + (index % 10)).padStart(2, "0")}:15:00.000Z`,
    );
    const publishedAt =
      status === "available" || status === "reserved" || status === "sold"
      ? new Date(
          `2026-07-${String((index % 18) + 4).padStart(2, "0")}T09:30:00.000Z`,
        )
      : null;

    return {
      vehicle: {
        acquisitionDate,
        archivedAt:
          status === "archived"
            ? new Date("2026-08-04T14:00:00.000Z")
            : null,
        bodyType: vehicle.bodyType,
        co2Emission: vehicle.co2Emission ?? null,
        condition: vehicle.condition,
        consumption: vehicle.consumption ?? null,
        createdAt: acquisitionDate,
        description: vehicle.description,
        exteriorColor: vehicle.exteriorColor,
        features: [...vehicle.features],
        firstRegistration: asUtcMonth(vehicle.firstRegistration),
        fuelType: vehicle.fuelType,
        id,
        inspectionStatus: getInspectionStatus(status),
        isFeatured: vehicle.isFeatured,
        labels: [...vehicle.labels],
        make: vehicle.make,
        marginEstimateCents: (1_800 + index * 145) * 100,
        mileage: vehicle.mileage,
        model: vehicle.model,
        ownerCount: (index % 3) + 1,
        powerKw: vehicle.powerKw,
        priceCents: Math.round(vehicle.price * 100),
        publishedAt,
        reservedAt:
          status === "reserved"
            ? new Date("2026-08-01T09:00:00.000Z")
            : null,
        reservedUntil:
          status === "reserved"
            ? new Date("2026-08-09T17:00:00.000Z")
            : null,
        slug,
        soldAt:
          status === "sold"
            ? new Date("2026-07-28T13:20:00.000Z")
            : null,
        status,
        stockNumber: `KA-${String(2_600 + index)}`,
        transmissionType: vehicle.transmissionType,
        updatedAt,
        variant: vehicle.variant,
        vinLastSix: String(730_000 + index * 137).slice(-6),
      },
      images: vehicle.images.map((url, position) => ({
        altText: `${vehicle.make} ${vehicle.model} ${vehicle.variant}`,
        createdAt: updatedAt,
        height: 934,
        id: createStableDevelopmentId(
          "media",
          index * vehicle.images.length + position + 1,
        ),
        mimeType: "image/jpeg",
        originalFilename: `${slug}-${position + 1}.jpg`,
        position,
        provider: "development",
        providerAssetId: `${slug}/${position}`,
        sizeBytes: BigInt((420 + index * 32 + position * 8) * 1_024),
        title: `${vehicle.make} ${vehicle.model} image ${position + 1}`,
        updatedAt,
        url,
        vehicleId: id,
        width: 1_400,
      })),
    };
  });
}

function createStableDevelopmentId(namespace: string, sequence: number) {
  if (!/^[a-z0-9]+$/u.test(namespace) || namespace.length > 22) {
    throw new Error("Development ID namespace must be short and alphanumeric.");
  }

  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new Error("Development ID sequence must be a positive integer.");
  }

  const prefix = `c${namespace}`;
  const suffixLength = 25 - prefix.length;

  return `${prefix}${sequence.toString(36).padStart(suffixLength, "0")}`;
}

function asUtcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function asUtcMonth(value: string) {
  return asUtcDate(`${value}-01`);
}

function getInspectionStatus(
  status: DevelopmentVehicleStatus,
): DevelopmentInspectionStatus {
  if (status === "draft") return "in_progress";
  if (status === "archived") return "pending";
  return "passed";
}
