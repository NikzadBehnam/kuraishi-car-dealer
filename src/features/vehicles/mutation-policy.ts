import type { VehicleStatus } from "./constants.ts";
import type { VehicleWriteInput } from "./schemas.ts";

const vehicleStatusTransitions = {
  draft: ["available", "archived"],
  available: ["draft", "reserved", "sold", "archived"],
  reserved: ["available", "sold", "archived"],
  sold: ["available", "archived"],
  archived: ["draft", "available"],
} as const satisfies Record<VehicleStatus, readonly VehicleStatus[]>;

export type VehicleLifecycleDates = {
  archivedAt: Date | null;
  publishedAt: Date | null;
  reservedAt: Date | null;
  reservedUntil: Date | null;
  soldAt: Date | null;
};

export function buildVehiclePersistenceData(input: VehicleWriteInput) {
  return {
    ...input,
    firstRegistration: new Date(`${input.firstRegistration}-01T00:00:00.000Z`),
  };
}

export function resolveVehicleLifecycleDates(
  nextStatus: VehicleStatus,
  current: VehicleLifecycleDates | null,
  now: Date,
): VehicleLifecycleDates {
  if (current && nextStatus === getCurrentLifecycleStatus(current)) {
    return { ...current };
  }

  switch (nextStatus) {
    case "draft":
      return emptyLifecycleDates();
    case "available":
      return {
        ...emptyLifecycleDates(),
        publishedAt: current?.publishedAt ?? now,
      };
    case "reserved":
      return {
        ...emptyLifecycleDates(),
        publishedAt: current?.publishedAt ?? now,
        reservedAt: now,
      };
    case "sold":
      return {
        archivedAt: null,
        publishedAt: current?.publishedAt ?? now,
        reservedAt: current?.reservedAt ?? null,
        reservedUntil: current?.reservedUntil ?? null,
        soldAt: now,
      };
    case "archived":
      return {
        archivedAt: now,
        publishedAt: current?.publishedAt ?? null,
        reservedAt: current?.reservedAt ?? null,
        reservedUntil: current?.reservedUntil ?? null,
        soldAt: current?.soldAt ?? null,
      };
  }
}

export function canTransitionVehicleStatus(
  currentStatus: VehicleStatus,
  nextStatus: VehicleStatus,
) {
  return (
    currentStatus === nextStatus ||
    (
      vehicleStatusTransitions[currentStatus] as readonly VehicleStatus[]
    ).includes(nextStatus)
  );
}

export function buildVehicleDuplicateIdentifiers(
  vehicle: { slug: string; stockNumber: string },
  token: string,
) {
  const normalizedToken = token.replace(/[^a-z0-9]/giu, "").slice(0, 12);

  if (!normalizedToken) {
    throw new Error("A duplicate identifier token is required.");
  }

  return {
    slug: appendBoundedSuffix(
      vehicle.slug,
      `-copy-${normalizedToken.toLowerCase()}`,
      120,
    ),
    stockNumber: appendBoundedSuffix(
      vehicle.stockNumber,
      `-COPY-${normalizedToken.toUpperCase()}`,
      64,
    ),
  };
}

function emptyLifecycleDates(): VehicleLifecycleDates {
  return {
    archivedAt: null,
    publishedAt: null,
    reservedAt: null,
    reservedUntil: null,
    soldAt: null,
  };
}

function getCurrentLifecycleStatus(
  current: VehicleLifecycleDates,
): VehicleStatus | null {
  if (current.archivedAt) return "archived";
  if (current.soldAt) return "sold";
  if (current.reservedAt) return "reserved";
  if (current.publishedAt) return "available";
  return "draft";
}

function appendBoundedSuffix(value: string, suffix: string, maxLength: number) {
  const stem = value.slice(0, maxLength - suffix.length).replace(/-+$/u, "");

  return `${stem}${suffix}`;
}
