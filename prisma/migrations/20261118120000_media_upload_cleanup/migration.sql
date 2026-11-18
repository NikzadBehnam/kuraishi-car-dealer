ALTER TABLE "MediaUploadIntent"
    ADD COLUMN "cancelledAt" TIMESTAMPTZ(3),
    ADD CONSTRAINT "MediaUploadIntent_terminalState_check" CHECK (
        NOT ("completedAt" IS NOT NULL AND "cancelledAt" IS NOT NULL)
    );
