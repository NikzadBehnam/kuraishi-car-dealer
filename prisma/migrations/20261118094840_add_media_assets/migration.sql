-- CreateEnum
CREATE TYPE "MediaAssetType" AS ENUM ('image', 'document', 'brand');

-- CreateEnum
CREATE TYPE "MediaBucketAccess" AS ENUM ('private', 'public_read');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "objectKey" VARCHAR(1024) NOT NULL,
    "bucketAccess" "MediaBucketAccess" NOT NULL,
    "type" "MediaAssetType" NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "originalFilename" VARCHAR(255) NOT NULL,
    "altText" TEXT,
    "verifiedMimeType" VARCHAR(127) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "uploadedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedById" TEXT NOT NULL,
    "publicApprovedAt" TIMESTAMPTZ(3),
    "publicApprovedById" TEXT,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaAsset_type_bucketAccess_idx" ON "MediaAsset"("type", "bucketAccess");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedAt_id_idx" ON "MediaAsset"("uploadedAt" DESC, "id");

-- CreateIndex
CREATE INDEX "MediaAsset_uploadedById_idx" ON "MediaAsset"("uploadedById");

-- CreateIndex
CREATE INDEX "MediaAsset_publicApprovedById_idx" ON "MediaAsset"("publicApprovedById");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_bucketAccess_objectKey_key" ON "MediaAsset"("bucketAccess", "objectKey");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_publicApprovedById_fkey" FOREIGN KEY ("publicApprovedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
