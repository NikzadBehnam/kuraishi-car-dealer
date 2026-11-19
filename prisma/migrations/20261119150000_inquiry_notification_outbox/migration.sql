BEGIN;

CREATE TYPE "InquiryNotificationStatus" AS ENUM (
    'disabled',
    'pending',
    'sending',
    'retry',
    'sent',
    'failed'
);

CREATE TABLE "InquiryNotification" (
    "id" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "status" "InquiryNotificationStatus" NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseExpiresAt" TIMESTAMPTZ(3),
    "idempotencyKey" VARCHAR(80) NOT NULL,
    "providerMessageId" VARCHAR(200),
    "lastErrorCode" VARCHAR(64),
    "sentAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InquiryNotification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "InquiryNotification_attemptCount_check" CHECK ("attemptCount" BETWEEN 0 AND 5),
    CONSTRAINT "InquiryNotification_attempt_state_check" CHECK (
        "status" NOT IN ('sending', 'retry', 'sent') OR "attemptCount" > 0
    ),
    CONSTRAINT "InquiryNotification_state_check" CHECK (
        ("status" = 'sending' AND "leaseExpiresAt" IS NOT NULL AND "sentAt" IS NULL)
        OR ("status" <> 'sending' AND "leaseExpiresAt" IS NULL)
    ),
    CONSTRAINT "InquiryNotification_sent_check" CHECK (
        ("status" = 'sent' AND "sentAt" IS NOT NULL AND "providerMessageId" IS NOT NULL)
        OR ("status" <> 'sent' AND "sentAt" IS NULL)
    ),
    CONSTRAINT "InquiryNotification_disabled_check" CHECK (
        "status" <> 'disabled' OR "attemptCount" = 0
    ),
    CONSTRAINT "InquiryNotification_error_code_check" CHECK (
        "lastErrorCode" IS NULL OR "lastErrorCode" IN (
            'provider_rejected',
            'provider_unavailable',
            'provider_response_invalid',
            'configuration_invalid',
            'invalid_notification',
            'attempts_exhausted'
        )
    ),
    CONSTRAINT "InquiryNotification_inquiryId_fkey"
        FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InquiryNotification_inquiryId_key"
    ON "InquiryNotification"("inquiryId");
CREATE UNIQUE INDEX "InquiryNotification_idempotencyKey_key"
    ON "InquiryNotification"("idempotencyKey");
CREATE INDEX "InquiryNotification_status_nextAttemptAt_createdAt_idx"
    ON "InquiryNotification"("status", "nextAttemptAt", "createdAt");
CREATE INDEX "InquiryNotification_status_leaseExpiresAt_idx"
    ON "InquiryNotification"("status", "leaseExpiresAt");

COMMIT;
