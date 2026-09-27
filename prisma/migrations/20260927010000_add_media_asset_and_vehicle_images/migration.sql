-- CreateTable
CREATE TABLE "media_asset" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAssetId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "title" TEXT NOT NULL,
    "altText" TEXT,
    "vehicleId" TEXT,
    "position" INTEGER,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "media_asset_vehicle_position_pair_check" CHECK (("vehicleId" IS NULL AND "position" IS NULL) OR ("vehicleId" IS NOT NULL AND "position" IS NOT NULL)),
    CONSTRAINT "media_asset_position_nonnegative_check" CHECK ("position" IS NULL OR "position" >= 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_provider_providerAssetId_key" ON "media_asset"("provider", "providerAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_vehicleId_position_key" ON "media_asset"("vehicleId", "position");

-- CreateIndex
CREATE INDEX "media_asset_uploadedByUserId_idx" ON "media_asset"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "media_asset_createdAt_idx" ON "media_asset"("createdAt");

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
