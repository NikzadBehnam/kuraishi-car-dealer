BEGIN;

ALTER TABLE "Inquiry"
    ADD COLUMN "submissionKey" UUID,
    ADD COLUMN "submissionHash" VARCHAR(64),
    ADD CONSTRAINT "Inquiry_submission_pair_check" CHECK (
        ("submissionKey" IS NULL AND "submissionHash" IS NULL)
        OR ("submissionKey" IS NOT NULL AND "submissionHash" ~ '^[0-9a-f]{64}$' AND "submissionHash" IS NOT NULL)
    );
CREATE UNIQUE INDEX "Inquiry_submissionKey_key" ON "Inquiry"("submissionKey");

CREATE TABLE "InquiryRateLimit" (
    "key" VARCHAR(64) NOT NULL,
    "count" INTEGER NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "InquiryRateLimit_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "InquiryRateLimit_values_check" CHECK ("count" > 0 AND "key" ~ '^[0-9a-f]{64}$')
);
CREATE INDEX "InquiryRateLimit_expiresAt_idx" ON "InquiryRateLimit"("expiresAt");

COMMIT;
