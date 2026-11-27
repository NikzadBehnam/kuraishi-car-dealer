BEGIN;

CREATE TABLE "VehiclePhoto" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "objectKey" VARCHAR(1024) NOT NULL,
    "position" SMALLINT NOT NULL,
    "altText" TEXT,
    "mimeType" VARCHAR(127) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    CONSTRAINT "VehiclePhoto_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "VehiclePhoto_position_check" CHECK ("position" BETWEEN 0 AND 19),
    CONSTRAINT "VehiclePhoto_size_check" CHECK ("sizeBytes" > 0),
    CONSTRAINT "VehiclePhoto_vehicleId_fkey" FOREIGN KEY ("vehicleId")
        REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "VehiclePhoto_objectKey_key" ON "VehiclePhoto"("objectKey");
CREATE UNIQUE INDEX "VehiclePhoto_vehicleId_position_key" ON "VehiclePhoto"("vehicleId", "position");

-- Cutover prerequisite: copy and verify each attached public object at its
-- photo-migration/<asset ID> key in the private bucket before running this SQL.
INSERT INTO "VehiclePhoto" ("id", "vehicleId", "objectKey", "position", "altText", "mimeType", "sizeBytes")
SELECT
    asset."id",
    attachment."vehicleId",
    CASE WHEN asset."bucketAccess" = 'public_read'
        THEN 'photo-migration/' || asset."id"
        ELSE asset."objectKey"
    END,
    attachment."position",
    asset."altText",
    asset."verifiedMimeType",
    asset."sizeBytes"
FROM "VehicleMedia" AS attachment
JOIN "MediaAsset" AS asset ON asset."id" = attachment."mediaAssetId";

COMMIT;
