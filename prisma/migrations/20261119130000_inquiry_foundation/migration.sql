BEGIN;

CREATE TYPE "InquirySource" AS ENUM ('contact', 'test-drive', 'callback');
CREATE TYPE "InquiryService" AS ENUM ('test_drive', 'consultation', 'vehicle_valuation', 'workshop', 'callback');

CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "customerName" VARCHAR(200) NOT NULL,
    "customerEmail" VARCHAR(254) NOT NULL,
    "customerPhone" VARCHAR(32),
    "message" VARCHAR(1000) NOT NULL,
    "source" "InquirySource" NOT NULL,
    "requestedService" "InquiryService" NOT NULL,
    "preferredDate" DATE,
    "vehicleId" TEXT,
    "vehicleSlugSnapshot" VARCHAR(200),
    "vehicleTitleSnapshot" VARCHAR(500),
    "privacyNoticeVersion" VARCHAR(64) NOT NULL,
    "privacyNoticeText" TEXT NOT NULL,
    "privacyAcknowledgedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Inquiry_identity_check" CHECK (
        length(btrim("customerName")) >= 2 AND length(btrim("customerEmail")) > 0
        AND ("customerPhone" IS NULL OR length(btrim("customerPhone")) > 0)
    ),
    CONSTRAINT "Inquiry_source_check" CHECK (
        ("requestedService" = 'test_drive' AND "source" = 'test-drive')
        OR ("requestedService" = 'callback' AND "source" = 'callback')
        OR ("requestedService" IN ('consultation', 'vehicle_valuation', 'workshop') AND "source" = 'contact')
    ),
    CONSTRAINT "Inquiry_vehicle_snapshot_check" CHECK (
        ("vehicleSlugSnapshot" IS NULL AND "vehicleTitleSnapshot" IS NULL AND "vehicleId" IS NULL)
        OR (length(btrim("vehicleSlugSnapshot")) > 0 AND length(btrim("vehicleTitleSnapshot")) > 0
            AND "vehicleSlugSnapshot" IS NOT NULL AND "vehicleTitleSnapshot" IS NOT NULL)
    ),
    CONSTRAINT "Inquiry_privacy_check" CHECK (
        length(btrim("privacyNoticeVersion")) > 0 AND length(btrim("privacyNoticeText")) > 0
    )
);

CREATE INDEX "Inquiry_createdAt_id_idx" ON "Inquiry"("createdAt" DESC, "id");
CREATE INDEX "Inquiry_vehicleId_idx" ON "Inquiry"("vehicleId");
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
