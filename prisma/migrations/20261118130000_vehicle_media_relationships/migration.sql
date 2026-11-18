CREATE TABLE "VehicleMedia" (
    "vehicleId" TEXT NOT NULL,
    "mediaAssetId" TEXT NOT NULL,
    "position" SMALLINT NOT NULL,

    CONSTRAINT "VehicleMedia_pkey" PRIMARY KEY ("vehicleId", "position"),
    CONSTRAINT "VehicleMedia_position_check" CHECK ("position" BETWEEN 0 AND 19)
);

CREATE UNIQUE INDEX "VehicleMedia_mediaAssetId_key"
    ON "VehicleMedia"("mediaAssetId");

ALTER TABLE "VehicleMedia"
    ADD CONSTRAINT "VehicleMedia_vehicleId_fkey"
    FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "VehicleMedia_mediaAssetId_fkey"
    FOREIGN KEY ("mediaAssetId") REFERENCES "MediaAsset"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE FUNCTION "vehicle_media_image_only"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM 1
    FROM "MediaAsset"
    WHERE "id" = NEW."mediaAssetId"
      AND "type" = 'image'
    FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vehicle media attachments must reference image assets'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "VehicleMedia_image_only"
BEFORE INSERT OR UPDATE OF "mediaAssetId" ON "VehicleMedia"
FOR EACH ROW
EXECUTE FUNCTION "vehicle_media_image_only"();

CREATE FUNCTION "media_asset_vehicle_type_immutable"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."type" IS DISTINCT FROM OLD."type"
       AND EXISTS (
           SELECT 1
           FROM "VehicleMedia"
           WHERE "mediaAssetId" = OLD."id"
       ) THEN
        RAISE EXCEPTION 'Attached vehicle media must remain an image asset'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "MediaAsset_vehicle_type_immutable"
BEFORE UPDATE OF "type" ON "MediaAsset"
FOR EACH ROW
EXECUTE FUNCTION "media_asset_vehicle_type_immutable"();
