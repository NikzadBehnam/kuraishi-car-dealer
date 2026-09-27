import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import {
  actionFailure,
  actionSuccess,
  type ActionFailure,
  type ActionResult,
} from "@/features/shared/action-result";
import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  authCapabilities,
  requireCapability,
} from "@/lib/auth/authorization";
import { prisma } from "@/lib/prisma";

import type { VehicleStatus } from "../constants.ts";
import {
  buildVehicleDuplicateIdentifiers,
  buildVehiclePersistenceData,
  canTransitionVehicleStatus,
  resolveVehicleLifecycleDates,
  type VehicleLifecycleDates,
} from "../mutation-policy.ts";
import {
  bulkVehicleLifecycleCommandSchema,
  createVehicleInputSchema,
  duplicateVehicleCommandSchema,
  updateVehicleInputSchema,
  vehicleLifecycleCommandSchema,
} from "../schemas.ts";

export type VehicleCommandResult = {
  id: string;
  previousSlug?: string;
  slug: string;
  status: VehicleStatus;
  stockNumber: string;
};

export type BulkVehicleLifecycleCommandResult = {
  items: VehicleCommandResult[];
  status: VehicleStatus;
  updatedCount: number;
};

const vehicleCommandSelect = {
  id: true,
  slug: true,
  status: true,
  stockNumber: true,
} satisfies Prisma.VehicleSelect;

const vehicleLifecycleSelect = {
  archivedAt: true,
  id: true,
  make: true,
  model: true,
  publishedAt: true,
  reservedAt: true,
  reservedUntil: true,
  slug: true,
  soldAt: true,
  status: true,
  stockNumber: true,
} satisfies Prisma.VehicleSelect;

const vehicleDuplicateSelect = {
  bodyType: true,
  co2Emission: true,
  condition: true,
  consumption: true,
  description: true,
  exteriorColor: true,
  features: true,
  firstRegistration: true,
  fuelType: true,
  id: true,
  labels: true,
  make: true,
  marginEstimateCents: true,
  mileage: true,
  model: true,
  ownerCount: true,
  powerKw: true,
  priceCents: true,
  slug: true,
  stockNumber: true,
  transmissionType: true,
  variant: true,
  vinLastSix: true,
} satisfies Prisma.VehicleSelect;

export async function createVehicle(
  input: unknown,
): Promise<ActionResult<VehicleCommandResult>> {
  try {
    const session = await requireCapability(authCapabilities.manageVehicles);
    const parsed = createVehicleInputSchema.safeParse(input);

    if (!parsed.success) return validationFailure(parsed.error);

    const now = new Date();
    const data = buildVehiclePersistenceData(parsed.data);
    const lifecycleDates = resolveVehicleLifecycleDates(
      parsed.data.status,
      null,
      now,
    );

    const vehicle = await prisma.$transaction(async (transaction) => {
      const created = await transaction.vehicle.create({
        data: {
          ...data,
          ...lifecycleDates,
          updatedByUserId: session.user.id,
        },
        select: vehicleCommandSelect,
      });

      await transaction.activityEvent.create({
        data: buildActivityEvent({
          action: "created",
          actor: session.user,
          vehicle: {
            id: created.id,
            label: getVehicleLabel(parsed.data),
            status: created.status,
            stockNumber: created.stockNumber,
          },
        }),
      });

      return created;
    });

    return actionSuccess(vehicle);
  } catch (error) {
    return commandFailure(error);
  }
}

export async function updateVehicle(
  input: unknown,
): Promise<ActionResult<VehicleCommandResult>> {
  try {
    const session = await requireCapability(authCapabilities.manageVehicles);
    const parsed = updateVehicleInputSchema.safeParse(input);

    if (!parsed.success) return validationFailure(parsed.error);

    const now = new Date();
    const data = buildVehiclePersistenceData(parsed.data.vehicle);

    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.vehicle.findUnique({
        where: { id: parsed.data.id },
        select: vehicleLifecycleSelect,
      });

      if (!current) return null;

      assertVehicleStatusTransition(current.status, parsed.data.vehicle.status);

      const lifecycleDates = resolveVehicleLifecycleDates(
        parsed.data.vehicle.status,
        toLifecycleDates(current),
        now,
      );
      const updated = await transaction.vehicle.update({
        where: { id: parsed.data.id },
        data: {
          ...data,
          ...lifecycleDates,
          updatedByUserId: session.user.id,
        },
        select: vehicleCommandSelect,
      });

      const activityEvents = [
        buildActivityEvent({
          action: "updated",
          actor: session.user,
          vehicle: {
            id: updated.id,
            label: getVehicleLabel(parsed.data.vehicle),
            status: updated.status,
            stockNumber: updated.stockNumber,
          },
        }),
      ];

      if (current.status !== updated.status) {
        activityEvents.push(
          buildLifecycleActivityEvent({
            actor: session.user,
            currentStatus: current.status,
            nextStatus: updated.status,
            vehicle: {
              id: updated.id,
              label: getVehicleLabel(parsed.data.vehicle),
              stockNumber: updated.stockNumber,
            },
          }),
        );
      }

      await transaction.activityEvent.createMany({ data: activityEvents });

      return {
        ...updated,
        ...(current.slug !== updated.slug
          ? { previousSlug: current.slug }
          : {}),
      };
    });

    return result
      ? actionSuccess(result)
      : actionFailure("NOT_FOUND", "The vehicle no longer exists.");
  } catch (error) {
    return commandFailure(error);
  }
}

export async function transitionVehicleLifecycle(
  input: unknown,
): Promise<ActionResult<VehicleCommandResult>> {
  try {
    const session = await requireCapability(authCapabilities.manageVehicles);
    const parsed = vehicleLifecycleCommandSchema.safeParse(input);

    if (!parsed.success) return validationFailure(parsed.error);

    const now = new Date();
    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.vehicle.findUnique({
        where: { id: parsed.data.id },
        select: vehicleLifecycleSelect,
      });

      if (!current) return null;

      assertVehicleStatusTransition(current.status, parsed.data.status);

      if (current.status === parsed.data.status) {
        return toVehicleCommandResult(current);
      }

      const updated = await transaction.vehicle.update({
        where: { id: current.id },
        data: {
          ...resolveVehicleLifecycleDates(
            parsed.data.status,
            toLifecycleDates(current),
            now,
          ),
          status: parsed.data.status,
          updatedByUserId: session.user.id,
        },
        select: vehicleCommandSelect,
      });

      await transaction.activityEvent.create({
        data: buildLifecycleActivityEvent({
          actor: session.user,
          currentStatus: current.status,
          nextStatus: updated.status,
          vehicle: {
            id: updated.id,
            label: getVehicleLabel(current),
            stockNumber: updated.stockNumber,
          },
        }),
      });

      return updated;
    });

    return result
      ? actionSuccess(result)
      : actionFailure("NOT_FOUND", "The vehicle no longer exists.");
  } catch (error) {
    return commandFailure(error);
  }
}

export async function bulkTransitionVehicleLifecycle(
  input: unknown,
): Promise<ActionResult<BulkVehicleLifecycleCommandResult>> {
  try {
    const session = await requireCapability(authCapabilities.manageVehicles);
    const parsed = bulkVehicleLifecycleCommandSchema.safeParse(input);

    if (!parsed.success) return validationFailure(parsed.error);

    const now = new Date();
    const result = await prisma.$transaction(async (transaction) => {
      const vehicles = await transaction.vehicle.findMany({
        where: { id: { in: parsed.data.ids } },
        select: vehicleLifecycleSelect,
      });

      if (vehicles.length !== parsed.data.ids.length) return null;

      for (const vehicle of vehicles) {
        assertVehicleStatusTransition(vehicle.status, parsed.data.status);
      }

      const items: VehicleCommandResult[] = [];
      const activityEvents: Prisma.ActivityEventUncheckedCreateInput[] = [];

      for (const vehicle of vehicles) {
        if (vehicle.status === parsed.data.status) {
          items.push(toVehicleCommandResult(vehicle));
          continue;
        }

        const updated = await transaction.vehicle.update({
          where: { id: vehicle.id },
          data: {
            ...resolveVehicleLifecycleDates(
              parsed.data.status,
              toLifecycleDates(vehicle),
              now,
            ),
            status: parsed.data.status,
            updatedByUserId: session.user.id,
          },
          select: vehicleCommandSelect,
        });

        items.push(updated);
        activityEvents.push(
          buildLifecycleActivityEvent({
            actor: session.user,
            currentStatus: vehicle.status,
            nextStatus: updated.status,
            vehicle: {
              id: updated.id,
              label: getVehicleLabel(vehicle),
              stockNumber: updated.stockNumber,
            },
          }),
        );
      }

      if (activityEvents.length > 0) {
        await transaction.activityEvent.createMany({ data: activityEvents });
      }

      return {
        items,
        status: parsed.data.status,
        updatedCount: activityEvents.length,
      };
    });

    return result
      ? actionSuccess(result)
      : actionFailure(
          "NOT_FOUND",
          "One or more selected vehicles no longer exist.",
        );
  } catch (error) {
    return commandFailure(error);
  }
}

export async function duplicateVehicle(
  input: unknown,
): Promise<ActionResult<VehicleCommandResult>> {
  try {
    const session = await requireCapability(authCapabilities.manageVehicles);
    const parsed = duplicateVehicleCommandSchema.safeParse(input);

    if (!parsed.success) return validationFailure(parsed.error);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const duplicate = await prisma.$transaction(async (transaction) => {
          const source = await transaction.vehicle.findUnique({
            where: { id: parsed.data.id },
            select: vehicleDuplicateSelect,
          });

          if (!source) return null;

          const identifiers = buildVehicleDuplicateIdentifiers(
            source,
            randomUUID().slice(0, 8),
          );
          const created = await transaction.vehicle.create({
            data: {
              acquisitionDate: null,
              archivedAt: null,
              bodyType: source.bodyType,
              co2Emission: source.co2Emission,
              condition: source.condition,
              consumption: source.consumption,
              description: source.description,
              exteriorColor: source.exteriorColor,
              features: source.features,
              firstRegistration: source.firstRegistration,
              fuelType: source.fuelType,
              inspectionStatus: "pending",
              isFeatured: false,
              labels: source.labels,
              make: source.make,
              marginEstimateCents: source.marginEstimateCents,
              mileage: source.mileage,
              model: source.model,
              ownerCount: source.ownerCount,
              powerKw: source.powerKw,
              priceCents: source.priceCents,
              publishedAt: null,
              reservedAt: null,
              reservedUntil: null,
              slug: identifiers.slug,
              soldAt: null,
              status: "draft",
              stockNumber: identifiers.stockNumber,
              transmissionType: source.transmissionType,
              updatedByUserId: session.user.id,
              variant: source.variant,
              vinLastSix: source.vinLastSix,
            },
            select: vehicleCommandSelect,
          });

          await transaction.activityEvent.create({
            data: buildDuplicateActivityEvent({
              actor: session.user,
              sourceVehicleId: source.id,
              vehicle: {
                id: created.id,
                label: getVehicleLabel({
                  make: source.make,
                  model: source.model,
                  stockNumber: created.stockNumber,
                }),
                stockNumber: created.stockNumber,
              },
            }),
          });

          return created;
        });

        return duplicate
          ? actionSuccess(duplicate)
          : actionFailure("NOT_FOUND", "The vehicle no longer exists.");
      } catch (error) {
        if (hasPrismaErrorCode(error, "P2002") && attempt < 2) continue;
        throw error;
      }
    }

    return actionFailure(
      "CONFLICT",
      "The duplicate identifiers could not be allocated. Please try again.",
    );
  } catch (error) {
    return commandFailure(error);
  }
}

function buildActivityEvent({
  action,
  actor,
  vehicle,
}: {
  action: "created" | "updated";
  actor: {
    email: string;
    id: string;
    name: string;
    role?: string | null;
  };
  vehicle: {
    id: string;
    label: string;
    status: VehicleStatus;
    stockNumber: string;
  };
}): Prisma.ActivityEventUncheckedCreateInput {
  return {
    actorName: actor.name || actor.email,
    actorRole: actor.role ?? null,
    actorUserId: actor.id,
    metadata: {
      status: vehicle.status,
      stockNumber: vehicle.stockNumber,
    },
    severity: "success",
    summary: `${action === "created" ? "Created" : "Updated"} vehicle ${vehicle.label}.`,
    targetId: vehicle.id,
    targetLabel: vehicle.label,
    targetType: "vehicle",
    type: `vehicle.${action}`,
  };
}

function buildLifecycleActivityEvent({
  actor,
  currentStatus,
  nextStatus,
  vehicle,
}: {
  actor: VehicleActivityActor;
  currentStatus: VehicleStatus;
  nextStatus: VehicleStatus;
  vehicle: VehicleActivityTarget;
}): Prisma.ActivityEventUncheckedCreateInput {
  return {
    actorName: actor.name || actor.email,
    actorRole: actor.role ?? null,
    actorUserId: actor.id,
    metadata: {
      fromStatus: currentStatus,
      stockNumber: vehicle.stockNumber,
      toStatus: nextStatus,
    },
    severity: nextStatus === "archived" ? "warning" : "success",
    summary: `Changed ${vehicle.label} from ${currentStatus} to ${nextStatus}.`,
    targetId: vehicle.id,
    targetLabel: vehicle.label,
    targetType: "vehicle",
    type: "vehicle.status.changed",
  };
}

function buildDuplicateActivityEvent({
  actor,
  sourceVehicleId,
  vehicle,
}: {
  actor: VehicleActivityActor;
  sourceVehicleId: string;
  vehicle: VehicleActivityTarget;
}): Prisma.ActivityEventUncheckedCreateInput {
  return {
    actorName: actor.name || actor.email,
    actorRole: actor.role ?? null,
    actorUserId: actor.id,
    metadata: {
      sourceVehicleId,
      status: "draft",
      stockNumber: vehicle.stockNumber,
    },
    severity: "success",
    summary: `Duplicated vehicle as ${vehicle.label}.`,
    targetId: vehicle.id,
    targetLabel: vehicle.label,
    targetType: "vehicle",
    type: "vehicle.duplicated",
  };
}

type VehicleActivityActor = {
  email: string;
  id: string;
  name: string;
  role?: string | null;
};

type VehicleActivityTarget = {
  id: string;
  label: string;
  stockNumber: string;
};

function getVehicleLabel(vehicle: {
  make: string;
  model: string;
  stockNumber: string;
}) {
  return `${vehicle.make} ${vehicle.model} (${vehicle.stockNumber})`;
}

function toLifecycleDates(vehicle: VehicleLifecycleDates) {
  return {
    archivedAt: vehicle.archivedAt ?? null,
    publishedAt: vehicle.publishedAt ?? null,
    reservedAt: vehicle.reservedAt ?? null,
    reservedUntil: vehicle.reservedUntil ?? null,
    soldAt: vehicle.soldAt ?? null,
  };
}

function toVehicleCommandResult(vehicle: {
  id: string;
  slug: string;
  status: VehicleStatus;
  stockNumber: string;
}): VehicleCommandResult {
  return {
    id: vehicle.id,
    slug: vehicle.slug,
    status: vehicle.status,
    stockNumber: vehicle.stockNumber,
  };
}

function assertVehicleStatusTransition(
  currentStatus: VehicleStatus,
  nextStatus: VehicleStatus,
) {
  if (!canTransitionVehicleStatus(currentStatus, nextStatus)) {
    throw new InvalidVehicleStatusTransitionError(currentStatus, nextStatus);
  }
}

class InvalidVehicleStatusTransitionError extends Error {
  constructor(currentStatus: VehicleStatus, nextStatus: VehicleStatus) {
    super(`Vehicle cannot transition from ${currentStatus} to ${nextStatus}.`);
    this.name = "InvalidVehicleStatusTransitionError";
  }
}

function validationFailure(error: {
  issues: Array<{ message: string; path: PropertyKey[] }>;
}): ActionFailure {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const path = issue.path[0] === "vehicle" ? issue.path.slice(1) : issue.path;
    const field = path[0];

    if (typeof field !== "string") continue;

    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return actionFailure(
    "VALIDATION_ERROR",
    "Check the submitted vehicle fields.",
    Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  );
}

function commandFailure(error: unknown): ActionFailure {
  if (error instanceof AuthenticationRequiredError) {
    return actionFailure("AUTHENTICATION_REQUIRED", error.message);
  }

  if (error instanceof AuthorizationDeniedError) {
    return actionFailure("FORBIDDEN", error.message);
  }

  if (error instanceof InvalidVehicleStatusTransitionError) {
    return actionFailure("CONFLICT", error.message);
  }

  if (hasPrismaErrorCode(error, "P2002")) {
    return actionFailure(
      "CONFLICT",
      "A vehicle with this stock number or slug already exists.",
      getUniqueConstraintFieldErrors(error),
    );
  }

  if (hasPrismaErrorCode(error, "P2025")) {
    return actionFailure("NOT_FOUND", "The vehicle no longer exists.");
  }

  return actionFailure(
    "INTERNAL_ERROR",
    "The vehicle could not be saved. Please try again.",
  );
}

function hasPrismaErrorCode(error: unknown, code: string) {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    error.code === code
  );
}

function getUniqueConstraintFieldErrors(error: unknown) {
  const target =
    `${getPrismaErrorTarget(error)} ${getErrorMessage(error)}`.toLowerCase();
  const fieldErrors: Record<string, string[]> = {};

  if (target.includes("stocknumber")) {
    fieldErrors.stockNumber = ["This stock number is already in use."];
  }

  if (target.includes("slug")) {
    fieldErrors.slug = ["This slug is already in use."];
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

function getPrismaErrorTarget(error: unknown) {
  if (error === null || typeof error !== "object" || !("meta" in error)) {
    return "";
  }

  const meta = error.meta;

  if (meta === null || typeof meta !== "object" || !("target" in meta)) {
    return "";
  }

  return Array.isArray(meta.target)
    ? meta.target.map(String).join(" ")
    : String(meta.target ?? "");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "";
}
