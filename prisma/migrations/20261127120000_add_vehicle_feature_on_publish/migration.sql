ALTER TABLE "Vehicle"
    ADD COLUMN "featureOnPublish" BOOLEAN NOT NULL DEFAULT false,
    ADD CONSTRAINT "Vehicle_feature_on_publish_draft_check"
        CHECK (NOT "featureOnPublish" OR "status" = 'draft');
