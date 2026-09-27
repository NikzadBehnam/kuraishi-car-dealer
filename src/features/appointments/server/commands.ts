import "server-only";

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

import type { AppointmentStatus } from "../constants.ts";
import {
  canTransitionAppointmentStatus,
  resolveAppointmentLifecycleDates,
} from "../lifecycle-policy.ts";
import {
  appointmentDraftSchema,
  appointmentRescheduleCommandSchema,
  appointmentStatusCommandSchema,
} from "../schemas.ts";

export type AppointmentCommandResult = {
  id: string;
  startsAt: string;
  status: AppointmentStatus;
};

const appointmentCommandSelect = {
  id: true,
  startsAt: true,
  status: true,
} satisfies Prisma.AppointmentSelect;

const appointmentLifecycleSelect = {
  id: true,
  customerName: true,
  startsAt: true,
  endsAt: true,
  status: true,
  assignedToUserId: true,
  vehicleId: true,
  confirmedAt: true,
  completedAt: true,
  cancelledAt: true,
} satisfies Prisma.AppointmentSelect;

export async function createAppointment(
  input: unknown,
): Promise<ActionResult<AppointmentCommandResult>> {
  try {
    const session = await requireCapability(
      authCapabilities.manageAppointments,
    );
    const parsed = appointmentDraftSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (startsAt.getTime() < Date.now()) {
      return actionFailure(
        "VALIDATION_ERROR",
        "Choose a current or future appointment time.",
        { startsAt: ["Appointment start must not be in the past."] },
      );
    }

    const result = await prisma.$transaction(async (transaction) => {
      await assertReferencesExist(transaction, parsed.data);
      await assertNoAppointmentConflict(transaction, {
        assignedToUserId: parsed.data.assignedToUserId,
        endsAt,
        startsAt,
        vehicleId: parsed.data.vehicleId,
      });

      const appointment = await transaction.appointment.create({
        data: {
          assignedToUserId: parsed.data.assignedToUserId ?? null,
          customerEmail: parsed.data.customerEmail,
          customerName: parsed.data.customerName,
          customerPhone: parsed.data.customerPhone ?? null,
          endsAt,
          leadId: parsed.data.leadId ?? null,
          location: parsed.data.location,
          notes: parsed.data.notes ?? null,
          requestedByUserId: session.user.id,
          startsAt,
          status: "requested",
          type: parsed.data.type,
          vehicleId: parsed.data.vehicleId ?? null,
        },
        select: appointmentCommandSelect,
      });

      await transaction.activityEvent.create({
        data: buildAppointmentActivityEvent({
          action: "created",
          actor: session.user,
          appointment: {
            id: appointment.id,
            customerName: parsed.data.customerName,
            startsAt,
          },
          metadata: { status: appointment.status, type: parsed.data.type },
        }),
      });

      return appointment;
    });

    return actionSuccess(toCommandResult(result));
  } catch (error) {
    return commandFailure(error);
  }
}

export async function transitionAppointmentStatus(
  input: unknown,
): Promise<ActionResult<AppointmentCommandResult>> {
  try {
    const session = await requireCapability(
      authCapabilities.manageAppointments,
    );
    const parsed = appointmentStatusCommandSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    if (parsed.data.status === "cancelled" && !parsed.data.cancellationReason) {
      return actionFailure(
        "VALIDATION_ERROR",
        "Provide a cancellation reason.",
        { cancellationReason: ["Cancellation reason is required."] },
      );
    }

    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.appointment.findUnique({
        where: { id: parsed.data.id },
        select: appointmentLifecycleSelect,
      });
      if (!current) return null;

      if (!canTransitionAppointmentStatus(current.status, parsed.data.status)) {
        throw new InvalidAppointmentTransitionError(
          current.status,
          parsed.data.status,
        );
      }

      if (current.status === parsed.data.status) {
        return toCommandResult(current);
      }

      const updated = await transaction.appointment.update({
        where: { id: current.id },
        data: {
          ...resolveAppointmentLifecycleDates(
            current,
            parsed.data.status,
            new Date(),
          ),
          cancellationReason:
            parsed.data.status === "cancelled"
              ? parsed.data.cancellationReason
              : null,
          status: parsed.data.status,
        },
        select: appointmentCommandSelect,
      });

      await transaction.activityEvent.create({
        data: buildAppointmentActivityEvent({
          action: "status.changed",
          actor: session.user,
          appointment: current,
          metadata: {
            fromStatus: current.status,
            toStatus: updated.status,
          },
        }),
      });

      return toCommandResult(updated);
    });

    return result
      ? actionSuccess(result)
      : actionFailure("NOT_FOUND", "The appointment no longer exists.");
  } catch (error) {
    return commandFailure(error);
  }
}

export async function rescheduleAppointment(
  input: unknown,
): Promise<ActionResult<AppointmentCommandResult>> {
  try {
    const session = await requireCapability(
      authCapabilities.manageAppointments,
    );
    const parsed = appointmentRescheduleCommandSchema.safeParse(input);
    if (!parsed.success) return validationFailure(parsed.error);

    const startsAt = new Date(parsed.data.startsAt);
    const endsAt = new Date(parsed.data.endsAt);
    if (startsAt.getTime() < Date.now()) {
      return actionFailure(
        "VALIDATION_ERROR",
        "Choose a current or future appointment time.",
        { startsAt: ["Appointment start must not be in the past."] },
      );
    }

    const result = await prisma.$transaction(async (transaction) => {
      const current = await transaction.appointment.findUnique({
        where: { id: parsed.data.id },
        select: appointmentLifecycleSelect,
      });
      if (!current) return null;
      if (current.status !== "requested" && current.status !== "confirmed") {
        throw new AppointmentNotEditableError();
      }

      await assertNoAppointmentConflict(transaction, {
        assignedToUserId: current.assignedToUserId ?? undefined,
        endsAt,
        excludeId: current.id,
        startsAt,
        vehicleId: current.vehicleId ?? undefined,
      });

      const updated = await transaction.appointment.update({
        where: { id: current.id },
        data: { endsAt, startsAt },
        select: appointmentCommandSelect,
      });

      await transaction.activityEvent.create({
        data: buildAppointmentActivityEvent({
          action: "rescheduled",
          actor: session.user,
          appointment: { ...current, startsAt },
          metadata: {
            fromStartsAt: current.startsAt.toISOString(),
            toStartsAt: startsAt.toISOString(),
          },
        }),
      });

      return toCommandResult(updated);
    });

    return result
      ? actionSuccess(result)
      : actionFailure("NOT_FOUND", "The appointment no longer exists.");
  } catch (error) {
    return commandFailure(error);
  }
}

async function assertReferencesExist(
  transaction: Prisma.TransactionClient,
  input: {
    assignedToUserId?: string;
    leadId?: string;
    vehicleId?: string;
  },
) {
  const [user, lead, vehicle] = await Promise.all([
    input.assignedToUserId
      ? transaction.user.findUnique({
          where: { id: input.assignedToUserId },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.leadId
      ? transaction.lead.findUnique({
          where: { id: input.leadId },
          select: { id: true },
        })
      : Promise.resolve(null),
    input.vehicleId
      ? transaction.vehicle.findUnique({
          where: { id: input.vehicleId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (input.assignedToUserId && !user)
    throw new AppointmentReferenceError("user");
  if (input.leadId && !lead) throw new AppointmentReferenceError("lead");
  if (input.vehicleId && !vehicle)
    throw new AppointmentReferenceError("vehicle");
}

async function assertNoAppointmentConflict(
  transaction: Prisma.TransactionClient,
  input: {
    assignedToUserId?: string;
    endsAt: Date;
    excludeId?: string;
    startsAt: Date;
    vehicleId?: string;
  },
) {
  const resources: Prisma.AppointmentWhereInput[] = [];
  if (input.assignedToUserId) {
    resources.push({ assignedToUserId: input.assignedToUserId });
  }
  if (input.vehicleId) resources.push({ vehicleId: input.vehicleId });
  if (resources.length === 0) return;

  const conflict = await transaction.appointment.findFirst({
    where: {
      ...(input.excludeId ? { id: { not: input.excludeId } } : {}),
      status: { in: ["requested", "confirmed"] },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
      OR: resources,
    },
    select: { id: true },
  });

  if (conflict) throw new AppointmentConflictError();
}

function buildAppointmentActivityEvent({
  action,
  actor,
  appointment,
  metadata,
}: {
  action: "created" | "rescheduled" | "status.changed";
  actor: { email: string; id: string; name: string; role?: string | null };
  appointment: { customerName: string; id: string; startsAt: Date };
  metadata: Prisma.InputJsonObject;
}): Prisma.ActivityEventUncheckedCreateInput {
  return {
    actorName: actor.name || actor.email,
    actorRole: actor.role ?? null,
    actorUserId: actor.id,
    metadata,
    severity: action === "status.changed" ? "info" : "success",
    summary: `${action === "created" ? "Created" : action === "rescheduled" ? "Rescheduled" : "Updated"} appointment for ${appointment.customerName}.`,
    targetId: appointment.id,
    targetLabel: appointment.customerName,
    targetType: "appointment",
    type: `appointment.${action}`,
  };
}

function toCommandResult(appointment: {
  id: string;
  startsAt: Date;
  status: AppointmentStatus;
}): AppointmentCommandResult {
  return {
    id: appointment.id,
    startsAt: appointment.startsAt.toISOString(),
    status: appointment.status,
  };
}

class InvalidAppointmentTransitionError extends Error {
  constructor(current: AppointmentStatus, next: AppointmentStatus) {
    super(`Appointment cannot transition from ${current} to ${next}.`);
  }
}

class AppointmentNotEditableError extends Error {}
class AppointmentConflictError extends Error {}
class AppointmentReferenceError extends Error {
  constructor(readonly resource: "lead" | "user" | "vehicle") {
    super(`The selected ${resource} no longer exists.`);
  }
}

function validationFailure(error: {
  issues: Array<{ message: string; path: PropertyKey[] }>;
}): ActionFailure {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }
  return actionFailure(
    "VALIDATION_ERROR",
    "Check the submitted appointment fields.",
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
  if (error instanceof InvalidAppointmentTransitionError) {
    return actionFailure("CONFLICT", error.message);
  }
  if (error instanceof AppointmentNotEditableError) {
    return actionFailure(
      "CONFLICT",
      "Completed or cancelled appointments cannot be rescheduled.",
    );
  }
  if (error instanceof AppointmentConflictError) {
    return actionFailure(
      "CONFLICT",
      "The selected staff member or vehicle already has an overlapping appointment.",
    );
  }
  if (error instanceof AppointmentReferenceError) {
    return actionFailure("NOT_FOUND", error.message);
  }
  if (hasPrismaErrorCode(error, "P2025")) {
    return actionFailure("NOT_FOUND", "The appointment no longer exists.");
  }
  return actionFailure(
    "INTERNAL_ERROR",
    "The appointment could not be saved. Please try again.",
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
