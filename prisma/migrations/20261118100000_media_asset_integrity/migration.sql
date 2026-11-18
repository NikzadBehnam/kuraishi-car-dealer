-- Prisma does not represent CHECK constraints or triggers in its schema.
ALTER TABLE "MediaAsset"
    ADD CONSTRAINT "MediaAsset_objectKey_check" CHECK (
        length(btrim("objectKey")) > 0
        AND "objectKey" = btrim("objectKey")
        AND "objectKey" !~ '(^/|//|/$|(^|/)\.{1,2}(/|$))'
    ),
    ADD CONSTRAINT "MediaAsset_title_check" CHECK (
        length(btrim("title")) > 0
    ),
    ADD CONSTRAINT "MediaAsset_originalFilename_check" CHECK (
        length(btrim("originalFilename")) > 0
    ),
    ADD CONSTRAINT "MediaAsset_verifiedMimeType_check" CHECK (
        "verifiedMimeType" ~ '^[a-z0-9][a-z0-9!#$&^_.+-]{0,62}/[a-z0-9][a-z0-9!#$&^_.+-]{0,62}$'
    ),
    ADD CONSTRAINT "MediaAsset_sizeBytes_check" CHECK ("sizeBytes" > 0),
    ADD CONSTRAINT "MediaAsset_dimensions_check" CHECK (
        ("width" IS NULL) = ("height" IS NULL)
        AND ("width" IS NULL OR ("width" > 0 AND "height" > 0))
    ),
    ADD CONSTRAINT "MediaAsset_publicApproval_check" CHECK (
        (
            "bucketAccess" = 'private'
            AND "publicApprovedAt" IS NULL
            AND "publicApprovedById" IS NULL
        )
        OR (
            "bucketAccess" = 'public_read'
            AND "publicApprovedAt" IS NOT NULL
            AND "publicApprovedById" IS NOT NULL
        )
    );

CREATE FUNCTION "media_asset_storage_identity_immutable"() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."objectKey" IS DISTINCT FROM OLD."objectKey"
        OR NEW."bucketAccess" IS DISTINCT FROM OLD."bucketAccess"
        OR NEW."publicApprovedAt" IS DISTINCT FROM OLD."publicApprovedAt"
        OR NEW."publicApprovedById" IS DISTINCT FROM OLD."publicApprovedById" THEN
        RAISE EXCEPTION 'Media asset storage identity and access approval are immutable'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER "MediaAsset_storage_identity_immutable"
BEFORE UPDATE ON "MediaAsset"
FOR EACH ROW
EXECUTE FUNCTION "media_asset_storage_identity_immutable"();
