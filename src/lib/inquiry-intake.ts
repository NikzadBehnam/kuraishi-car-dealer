import "server-only";

import { Prisma } from "../generated/prisma/client.ts";
import { inquiryPrivacyNotice } from "../content/de/inquiry-privacy.ts";
import { prisma } from "./db.ts";
import { getPublicVehicleEligibilitySql } from "./inventory-eligibility.ts";
import {
  getInitialInquiryNotificationStatus,
  getInquiryNotificationIdempotencyKey,
} from "./inquiry-notification-retry.ts";
import {
  InquiryIntakeError,
  inquiryFieldsSchema,
  inquiryServiceMapping,
  inquirySubmissionSchema,
} from "./inquiry-validation.ts";

export const INQUIRY_LIMIT_WINDOW_SECONDS = 15 * 60;
const maximumNewInquiries = 5;

type SubmissionIdentity = { clientHash: string; payloadHash: string };

function assertSameSubmission(storedHash: string | null, payloadHash: string) {
  if (storedHash !== payloadHash) {
    throw new InquiryIntakeError(
      409,
      "Diese Anfrage wurde geändert. Bitte senden Sie sie mit einem neuen Anfrageschlüssel.",
    );
  }
}

export async function acceptInquiry(
  input: unknown,
  identity: SubmissionIdentity,
  now = new Date(),
): Promise<void> {
  const submission = inquirySubmissionSchema.parse(input);
  if (
    !/^[0-9a-f]{64}$/.test(identity.clientHash) ||
    !/^[0-9a-f]{64}$/.test(identity.payloadHash)
  ) {
    throw new Error("Inquiry submission identity is invalid.");
  }
  const existing = await prisma.inquiry.findUnique({
    where: { submissionKey: submission.requestId },
    select: { submissionHash: true },
  });
  if (existing) {
    assertSameSubmission(existing.submissionHash, identity.payloadHash);
    return;
  }
  inquiryFieldsSchema.parse(submission.fields);
  if (submission.privacyNoticeVersion !== inquiryPrivacyNotice.version) {
    throw new InquiryIntakeError(
      409,
      "Der Datenschutzhinweis wurde aktualisiert. Bitte laden Sie die Seite neu.",
    );
  }
  try {
    await prisma.$transaction(async (tx) => {
      const quota = await tx.$queryRaw<{ key: string }[]>`
        INSERT INTO "InquiryRateLimit" ("key", "count", "expiresAt")
        VALUES (${identity.clientHash}, 1, ${new Date(now.getTime() + INQUIRY_LIMIT_WINDOW_SECONDS * 1000)})
        ON CONFLICT ("key") DO UPDATE SET
          "count" = CASE WHEN "InquiryRateLimit"."expiresAt" <= ${now} THEN 1 ELSE "InquiryRateLimit"."count" + 1 END,
          "expiresAt" = CASE WHEN "InquiryRateLimit"."expiresAt" <= ${now}
            THEN EXCLUDED."expiresAt" ELSE "InquiryRateLimit"."expiresAt" END
        WHERE "InquiryRateLimit"."expiresAt" <= ${now} OR "InquiryRateLimit"."count" < ${maximumNewInquiries}
        RETURNING "key"
      `;
      if (quota.length !== 1) {
        throw new InquiryIntakeError(
          429,
          "Zu viele Anfragen. Bitte versuchen Sie es in 15 Minuten erneut.",
        );
      }

      let vehicle:
        | {
            id: string;
            slug: string;
            make: string;
            model: string;
            variant: string | null;
          }
        | undefined;
      if (submission.vehicleSlug !== null) {
        // Lock the eligible record until acceptance commits so withdrawal cannot race the snapshot.
        [vehicle] = await tx.$queryRaw<NonNullable<typeof vehicle>[]>`
          SELECT "id", "slug", "make", "model", "variant" FROM "Vehicle"
          WHERE "slug" = ${submission.vehicleSlug} AND ${getPublicVehicleEligibilitySql("inquiry")}
          FOR SHARE
        `;
        if (!vehicle) {
          throw new InquiryIntakeError(
            409,
            "Dieses Fahrzeug ist für Anfragen nicht mehr verfügbar. Entfernen Sie den Fahrzeugbezug oder wählen Sie ein anderes Fahrzeug.",
          );
        }
      }
      const fields = submission.fields;
      const inquiry = await tx.inquiry.create({
        data: {
          customerName: fields.name,
          customerEmail: fields.email,
          customerPhone: fields.phone || null,
          message: fields.message,
          ...inquiryServiceMapping[fields.appointmentType],
          preferredDate: fields.preferredDate
            ? new Date(`${fields.preferredDate}T00:00:00.000Z`)
            : null,
          vehicleId: vehicle?.id ?? null,
          vehicleSlugSnapshot: vehicle?.slug ?? null,
          vehicleTitleSnapshot: vehicle
            ? [vehicle.make, vehicle.model, vehicle.variant]
                .filter(Boolean)
                .join(" ")
            : null,
          privacyNoticeVersion: inquiryPrivacyNotice.version,
          privacyNoticeText: inquiryPrivacyNotice.text,
          privacyAcknowledgedAt: now,
          submissionKey: submission.requestId,
          submissionHash: identity.payloadHash,
        },
        select: { id: true },
      });
      await tx.inquiryNotification.create({
        data: {
          inquiryId: inquiry.id,
          status: getInitialInquiryNotificationStatus(process.env),
          idempotencyKey: getInquiryNotificationIdempotencyKey(inquiry.id),
        },
        select: { id: true },
      });
      await tx.$executeRaw`
        DELETE FROM "InquiryRateLimit" WHERE "key" IN (
          SELECT "key" FROM "InquiryRateLimit" WHERE "expiresAt" <= ${now}
          ORDER BY "expiresAt" LIMIT 100 FOR UPDATE SKIP LOCKED
        )
      `;
    });
  } catch (error) {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002") ||
      (error instanceof InquiryIntakeError && error.status === 429)
    ) {
      const concurrent = await prisma.inquiry.findUnique({
        where: { submissionKey: submission.requestId },
        select: { submissionHash: true },
      });
      if (concurrent) {
        assertSameSubmission(concurrent.submissionHash, identity.payloadHash);
        return;
      }
    }
    throw error;
  }
}
