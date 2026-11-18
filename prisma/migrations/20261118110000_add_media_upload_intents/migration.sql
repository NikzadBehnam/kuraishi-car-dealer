CREATE TABLE "MediaUploadIntent" (
    "id" TEXT NOT NULL,
    "objectKey" VARCHAR(1024) NOT NULL,
    "stagingKey" VARCHAR(1024) NOT NULL,
    "type" "MediaAssetType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "originalFilename" VARCHAR(255) NOT NULL,
    "altText" TEXT,
    "claimedMimeType" VARCHAR(127) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "MediaUploadIntent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MediaUploadIntent_objectKey_check" CHECK (
        "objectKey" ~ '^assets/[0-9a-f-]+\.(jpg|jpeg|png|pdf)$'
    ),
    CONSTRAINT "MediaUploadIntent_stagingKey_check" CHECK (
        "stagingKey" ~ '^incoming/[0-9a-f-]+$'
    ),
    CONSTRAINT "MediaUploadIntent_title_check" CHECK (
        length(btrim("title")) > 0
    ),
    CONSTRAINT "MediaUploadIntent_filename_check" CHECK (
        length(btrim("originalFilename")) > 0
        AND position('/' in "originalFilename") = 0
        AND position(chr(92) in "originalFilename") = 0
    ),
    CONSTRAINT "MediaUploadIntent_size_check" CHECK (
        (
            "claimedMimeType" IN ('image/jpeg', 'image/png')
            AND "type" IN ('image', 'brand')
            AND "sizeBytes" BETWEEN 1 AND 10485760
        )
        OR (
            "claimedMimeType" = 'application/pdf'
            AND "type" = 'document'
            AND "sizeBytes" BETWEEN 1 AND 20971520
        )
    ),
    CONSTRAINT "MediaUploadIntent_expiry_check" CHECK (
        "expiresAt" > "createdAt"
    )
);

CREATE UNIQUE INDEX "MediaUploadIntent_objectKey_key"
    ON "MediaUploadIntent"("objectKey");
CREATE UNIQUE INDEX "MediaUploadIntent_stagingKey_key"
    ON "MediaUploadIntent"("stagingKey");
CREATE INDEX "MediaUploadIntent_uploadedById_createdAt_idx"
    ON "MediaUploadIntent"("uploadedById", "createdAt");
CREATE INDEX "MediaUploadIntent_expiresAt_idx"
    ON "MediaUploadIntent"("expiresAt");

ALTER TABLE "MediaUploadIntent"
    ADD CONSTRAINT "MediaUploadIntent_uploadedById_fkey"
    FOREIGN KEY ("uploadedById") REFERENCES "user"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
