BEGIN;

LOCK TABLE "MediaAsset", "VehicleMedia", "MediaUploadIntent", "VehiclePhoto" IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM "MediaUploadIntent"
        WHERE "expiresAt" > statement_timestamp() AND "cancelledAt" IS NULL
    ) THEN
        RAISE EXCEPTION 'Freeze uploads and wait for all legacy upload grants to expire';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM "VehicleMedia" AS link
        JOIN "MediaAsset" AS asset ON asset."id" = link."mediaAssetId"
        LEFT JOIN "VehiclePhoto" AS photo ON photo."id" = asset."id"
        WHERE (photo."vehicleId", photo."position", photo."objectKey", photo."altText", photo."mimeType", photo."sizeBytes")
              IS DISTINCT FROM
              (link."vehicleId", link."position",
               CASE WHEN asset."bucketAccess" = 'public_read'
                    THEN 'photo-migration/' || asset."id" ELSE asset."objectKey" END,
               asset."altText", asset."verifiedMimeType", asset."sizeBytes")
    ) OR (SELECT count(*) FROM "VehiclePhoto") <> (SELECT count(*) FROM "VehicleMedia") THEN
        RAISE EXCEPTION 'Vehicle photo backfill differs from the frozen legacy associations';
    END IF;
END $$;

CREATE TABLE "VehiclePhotoUpload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vehicleId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "mimeType" VARCHAR(127) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),
    "claimedAt" TIMESTAMPTZ(3),
    CONSTRAINT "VehiclePhotoUpload_claim_check" CHECK
        ("claimedAt" IS NULL OR ("completedAt" IS NOT NULL AND "cancelledAt" IS NULL))
);
CREATE INDEX "VehiclePhotoUpload_expiresAt_idx" ON "VehiclePhotoUpload"("expiresAt");

CREATE TABLE "VehiclePhotoDeletion" (
    "objectKey" VARCHAR(1024) NOT NULL PRIMARY KEY,
    "queuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "VehiclePhotoDeletion_queuedAt_idx" ON "VehiclePhotoDeletion"("queuedAt");

DROP TABLE "VehicleMedia", "MediaAsset", "MediaUploadIntent";
DROP FUNCTION "vehicle_media_image_only"(), "media_asset_vehicle_type_immutable"(),
    "media_asset_storage_identity_immutable"();
DROP TYPE "MediaAssetType", "MediaBucketAccess";

COMMIT;
