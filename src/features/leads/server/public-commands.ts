import "server-only";

import { randomUUID } from "node:crypto";

import type { Prisma } from "@/generated/prisma/client";
import type { LeadSource as PrismaLeadSource } from "@/generated/prisma/enums";
import {
  actionFailure,
  actionSuccess,
  type ActionFailure,
  type ActionResult,
} from "@/features/shared/action-result";
import { getServerAuthSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

import {
  currentLeadConsentVersion,
  publicLeadRateLimit,
  type LeadSource,
} from "../constants.ts";
import {
  buildPublicContactLeadMessage,
  isPreferredContactDateInPast,
  parsePreferredContactDate,
  resolvePublicContactLeadSource,
} from "../public-contact-policy.ts";
import {
  buildValuationLeadMessage,
  describeValuationAccidentHistory,
  describeValuationCondition,
  describeValuationServiceHistory,
  isValuationFirstRegistrationInFuture,
  parseValuationFirstRegistration,
} from "../public-valuation-policy.ts";
import {
  publicContactLeadSubmissionSchema,
  publicVehicleValuationSubmissionSchema,
} from "../schemas.ts";

export type SubmitPublicContactLeadResult = {
  acceptedAt: string;
  id: string;
};

export type SubmitPublicVehicleValuationResult = SubmitPublicContactLeadResult;

const duplicateWindowMilliseconds = 60_000;

export async function submitPublicContactLead(
  input: unknown,
): Promise<ActionResult<SubmitPublicContactLeadResult>> {
  const now = new Date();

  if (hasFilledHoneypot(input)) {
    return actionSuccess({
      acceptedAt: now.toISOString(),
      id: randomUUID(),
    });
  }

  try {
    const parsed = publicContactLeadSubmissionSchema.safeParse(input);

    if (!parsed.success) return validationFailure(parsed.error);

    if (isPreferredContactDateInPast(parsed.data.preferredDate, now)) {
      return actionFailure(
        "VALIDATION_ERROR",
        "Check the submitted contact details.",
        { preferredDate: ["Choose today or a future date."] },
      );
    }

    const message = buildPublicContactLeadMessage(parsed.data);
    const preferredDate = parsePreferredContactDate(parsed.data.preferredDate);
    const source = resolvePublicContactLeadSource(parsed.data.appointmentType);
    const databaseSource = toPrismaLeadSource(source);
    const duplicateCutoff = new Date(
      now.getTime() - duplicateWindowMilliseconds,
    );
    const rateLimitCutoff = new Date(
      now.getTime() - publicLeadRateLimit.windowMinutes * 60_000,
    );

    const [recentDuplicate, recentSubmissionCount] = await Promise.all([
      prisma.lead.findFirst({
        where: {
          createdAt: { gte: duplicateCutoff },
          customerEmail: parsed.data.email,
          message,
          preferredDate,
          source: databaseSource,
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, id: true },
      }),
      prisma.lead.count({
        where: {
          createdAt: { gte: rateLimitCutoff },
          customerEmail: parsed.data.email,
        },
      }),
    ]);

    if (recentDuplicate) {
      return actionSuccess({
        acceptedAt: recentDuplicate.createdAt.toISOString(),
        id: recentDuplicate.id,
      });
    }

    if (recentSubmissionCount >= publicLeadRateLimit.maximumSubmissions) {
      return actionFailure(
        "RATE_LIMITED",
        "Please wait before sending another request.",
      );
    }

    const session = await getOptionalServerAuthSession();
    const result = await prisma.$transaction(async (transaction) => {
      const lead = await transaction.lead.create({
        data: {
          consentAcceptedAt: now,
          consentVersion: currentLeadConsentVersion,
          customerEmail: parsed.data.email,
          customerName: parsed.data.name,
          customerPhone: parsed.data.phone ?? null,
          message,
          preferredDate,
          priority: "medium",
          source: databaseSource,
          status: "new",
          submittedByUserId: session?.user.id ?? null,
        },
        select: { createdAt: true, id: true },
      });

      await transaction.activityEvent.create({
        data: buildLeadCreatedActivityEvent({
          actor: session?.user ?? null,
          appointmentType: parsed.data.appointmentType,
          customerName: parsed.data.name,
          leadId: lead.id,
          preferredDate,
          source,
        }),
      });

      return lead;
    });

    return actionSuccess({
      acceptedAt: result.createdAt.toISOString(),
      id: result.id,
    });
  } catch {
    return actionFailure(
      "INTERNAL_ERROR",
      "Your request could not be sent. Please try again.",
    );
  }
}

export async function submitPublicVehicleValuation(
  input: unknown,
): Promise<ActionResult<SubmitPublicVehicleValuationResult>> {
  const now = new Date();

  if (hasFilledHoneypot(input)) {
    return actionSuccess({
      acceptedAt: now.toISOString(),
      id: randomUUID(),
    });
  }

  try {
    const parsed = publicVehicleValuationSubmissionSchema.safeParse(input);

    if (!parsed.success) {
      return validationFailure(
        parsed.error,
        "Check the submitted vehicle details.",
      );
    }

    if (
      isValuationFirstRegistrationInFuture(parsed.data.firstRegistration, now)
    ) {
      return actionFailure(
        "VALIDATION_ERROR",
        "Check the submitted vehicle details.",
        { firstRegistration: ["Choose a current or past month."] },
      );
    }

    const firstRegistration = parseValuationFirstRegistration(
      parsed.data.firstRegistration,
    );
    const conditionDescription = describeValuationCondition(
      parsed.data.condition,
    );
    const accidentHistory = describeValuationAccidentHistory(
      parsed.data.accidentHistory,
    );
    const serviceHistory = describeValuationServiceHistory(
      parsed.data.serviceHistory,
    );
    const message = buildValuationLeadMessage(
      parsed.data.make,
      parsed.data.model,
    );
    const duplicateCutoff = new Date(
      now.getTime() - duplicateWindowMilliseconds,
    );
    const rateLimitCutoff = new Date(
      now.getTime() - publicLeadRateLimit.windowMinutes * 60_000,
    );

    const [recentDuplicate, recentSubmissionCount] = await Promise.all([
      prisma.lead.findFirst({
        where: {
          createdAt: { gte: duplicateCutoff },
          customerEmail: parsed.data.email,
          source: "valuation",
          valuationRequest: {
            is: {
              accidentHistory,
              conditionDescription,
              firstRegistration,
              make: parsed.data.make,
              mileage: parsed.data.mileage,
              model: parsed.data.model,
              serviceHistory,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true, id: true },
      }),
      prisma.lead.count({
        where: {
          createdAt: { gte: rateLimitCutoff },
          customerEmail: parsed.data.email,
        },
      }),
    ]);

    if (recentDuplicate) {
      return actionSuccess({
        acceptedAt: recentDuplicate.createdAt.toISOString(),
        id: recentDuplicate.id,
      });
    }

    if (recentSubmissionCount >= publicLeadRateLimit.maximumSubmissions) {
      return actionFailure(
        "RATE_LIMITED",
        "Please wait before sending another request.",
      );
    }

    const session = await getOptionalServerAuthSession();
    const result = await prisma.$transaction(async (transaction) => {
      const lead = await transaction.lead.create({
        data: {
          consentAcceptedAt: now,
          consentVersion: currentLeadConsentVersion,
          customerEmail: parsed.data.email,
          customerName: parsed.data.name,
          customerPhone: parsed.data.phone ?? null,
          message,
          priority: "medium",
          source: "valuation",
          status: "new",
          submittedByUserId: session?.user.id ?? null,
          valuationRequest: {
            create: {
              accidentHistory,
              conditionDescription,
              firstRegistration,
              make: parsed.data.make,
              mileage: parsed.data.mileage,
              model: parsed.data.model,
              serviceHistory,
            },
          },
        },
        select: { createdAt: true, id: true },
      });

      await transaction.activityEvent.create({
        data: buildValuationSubmittedActivityEvent({
          actor: session?.user ?? null,
          customerName: parsed.data.name,
          firstRegistration,
          leadId: lead.id,
          make: parsed.data.make,
          mileage: parsed.data.mileage,
          model: parsed.data.model,
        }),
      });

      return lead;
    });

    return actionSuccess({
      acceptedAt: result.createdAt.toISOString(),
      id: result.id,
    });
  } catch {
    return actionFailure(
      "INTERNAL_ERROR",
      "Your valuation request could not be sent. Please try again.",
    );
  }
}

function buildLeadCreatedActivityEvent({
  actor,
  appointmentType,
  customerName,
  leadId,
  preferredDate,
  source,
}: {
  actor: {
    email: string;
    id: string;
    name: string;
    role?: string | null;
  } | null;
  appointmentType: string;
  customerName: string;
  leadId: string;
  preferredDate: Date;
  source: string;
}): Prisma.ActivityEventUncheckedCreateInput {
  return {
    actorName: actor?.name || actor?.email || customerName,
    actorRole: actor?.role ?? null,
    actorUserId: actor?.id ?? null,
    metadata: {
      appointmentType,
      preferredDate: preferredDate.toISOString(),
      source,
    },
    severity: "info",
    summary: `Received a new ${source} lead from ${customerName}.`,
    targetId: leadId,
    targetLabel: customerName,
    targetType: "lead",
    type: "lead.created",
  };
}

function buildValuationSubmittedActivityEvent({
  actor,
  customerName,
  firstRegistration,
  leadId,
  make,
  mileage,
  model,
}: {
  actor: {
    email: string;
    id: string;
    name: string;
    role?: string | null;
  } | null;
  customerName: string;
  firstRegistration: Date;
  leadId: string;
  make: string;
  mileage: number;
  model: string;
}): Prisma.ActivityEventUncheckedCreateInput {
  return {
    actorName: actor?.name || actor?.email || customerName,
    actorRole: actor?.role ?? null,
    actorUserId: actor?.id ?? null,
    metadata: {
      firstRegistration: firstRegistration.toISOString(),
      make,
      mileage,
      model,
      source: "valuation",
    },
    severity: "info",
    summary: `Received a valuation request for ${make} ${model} from ${customerName}.`,
    targetId: leadId,
    targetLabel: `${make} ${model}`,
    targetType: "lead",
    type: "valuation.submitted",
  };
}

function toPrismaLeadSource(source: LeadSource): PrismaLeadSource {
  return source === "test-drive" ? "test_drive" : source;
}

async function getOptionalServerAuthSession() {
  try {
    return await getServerAuthSession();
  } catch {
    return null;
  }
}

function hasFilledHoneypot(input: unknown) {
  return (
    input !== null &&
    typeof input === "object" &&
    "website" in input &&
    typeof input.website === "string" &&
    input.website.trim().length > 0
  );
}

function validationFailure(
  error: { issues: Array<{ message: string; path: PropertyKey[] }> },
  message = "Check the submitted contact details.",
): ActionFailure {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (typeof field !== "string") continue;
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }

  return actionFailure(
    "VALIDATION_ERROR",
    message,
    Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  );
}
