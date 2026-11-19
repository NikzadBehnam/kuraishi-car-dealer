import "server-only";

import { Prisma } from "../generated/prisma/client.ts";
import { prisma } from "./db.ts";
import {
  createStaffInquiryNotification,
  inquiryNotificationSelect,
} from "./inquiry-notification.ts";
import {
  parseInquiryEmailConfig,
  type InquiryEmailConfig,
} from "./inquiry-email-config.ts";
import { sendResendNotification } from "./inquiry-notification-provider.ts";
import {
  INQUIRY_NOTIFICATION_BATCH_SIZE,
  INQUIRY_NOTIFICATION_LEASE_MS,
  InquiryNotificationDeliveryError,
  MAX_INQUIRY_NOTIFICATION_ATTEMPTS,
  getInquiryNotificationFailureTransition,
} from "./inquiry-notification-retry.ts";

const deliverySelect = {
  id: true,
  attemptCount: true,
  idempotencyKey: true,
  inquiry: { select: inquiryNotificationSelect },
} satisfies Prisma.InquiryNotificationSelect;

type DeliveryRow = Prisma.InquiryNotificationGetPayload<{
  select: typeof deliverySelect;
}>;

function isRetryable(error: unknown) {
  return error instanceof InquiryNotificationDeliveryError
    ? error.retryable
    : false;
}

export async function processDueInquiryNotifications(
  now = new Date(),
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<{ claimed: number; sent: number; retried: number; failed: number }> {
  let config: InquiryEmailConfig;
  try {
    config = parseInquiryEmailConfig(env);
  } catch {
    throw new InquiryNotificationDeliveryError("configuration_invalid", false);
  }
  if (config.mode !== "test") {
    throw new InquiryNotificationDeliveryError("configuration_invalid", false);
  }

  const deliveries: DeliveryRow[] = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "InquiryNotification"
      SET "status" = 'failed',
          "leaseExpiresAt" = NULL,
          "lastErrorCode" = 'attempts_exhausted',
          "updatedAt" = ${now}
      WHERE "status"::text = 'sending'
        AND "leaseExpiresAt" <= ${now}
        AND "attemptCount" >= ${MAX_INQUIRY_NOTIFICATION_ATTEMPTS}
    `;
    const claimed = await tx.$queryRaw<{ id: string }[]>`
      WITH candidates AS (
        SELECT "id"
        FROM "InquiryNotification"
        WHERE "attemptCount" < ${MAX_INQUIRY_NOTIFICATION_ATTEMPTS}
          AND (
            ("status"::text IN ('pending', 'retry') AND "nextAttemptAt" <= ${now})
            OR ("status"::text = 'sending' AND "leaseExpiresAt" <= ${now})
          )
        ORDER BY "nextAttemptAt", "createdAt"
        LIMIT ${INQUIRY_NOTIFICATION_BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      )
      UPDATE "InquiryNotification" AS notification
      SET "status" = 'sending',
          "attemptCount" = notification."attemptCount" + 1,
          "leaseExpiresAt" = ${new Date(now.getTime() + INQUIRY_NOTIFICATION_LEASE_MS)},
          "lastErrorCode" = NULL,
          "updatedAt" = ${now}
      FROM candidates
      WHERE notification."id" = candidates."id"
      RETURNING notification."id"
    `;
    if (claimed.length === 0) return [];
    return tx.inquiryNotification.findMany({
      where: { id: { in: claimed.map(({ id }) => id) } },
      select: deliverySelect,
    });
  });

  const result = {
    claimed: deliveries.length,
    sent: 0,
    retried: 0,
    failed: 0,
  };
  for (const delivery of deliveries) {
    let providerMessageId: string;
    try {
      const notification = createStaffInquiryNotification(
        delivery.inquiry,
        env,
      );
      providerMessageId = await sendResendNotification(
        notification,
        delivery.idempotencyKey,
        config,
      );
    } catch (error) {
      const code =
        error instanceof InquiryNotificationDeliveryError
          ? error.code
          : "invalid_notification";
      const transition = getInquiryNotificationFailureTransition(
        delivery.attemptCount,
        now,
        code,
        isRetryable(error),
      );
      const update = await prisma.inquiryNotification.updateMany({
        where: {
          id: delivery.id,
          status: "sending",
          attemptCount: delivery.attemptCount,
        },
        data: {
          status: transition.status,
          nextAttemptAt: transition.nextAttemptAt ?? undefined,
          leaseExpiresAt: null,
          lastErrorCode: transition.errorCode,
        },
      });
      if (update.count === 0) continue;
      if (transition.status === "retry") result.retried++;
      else result.failed++;
      continue;
    }

    const update = await prisma.inquiryNotification.updateMany({
      where: {
        id: delivery.id,
        status: "sending",
        attemptCount: delivery.attemptCount,
      },
      data: {
        status: "sent",
        providerMessageId,
        sentAt: now,
        leaseExpiresAt: null,
        lastErrorCode: null,
      },
    });
    if (update.count > 0) result.sent++;
  }
  return result;
}
