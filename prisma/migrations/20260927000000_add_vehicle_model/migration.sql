-- CreateEnum
CREATE TYPE "VehicleFuelType" AS ENUM ('petrol', 'diesel', 'electric', 'hybrid');

-- CreateEnum
CREATE TYPE "VehicleTransmissionType" AS ENUM ('automatic', 'manual');

-- CreateEnum
CREATE TYPE "VehicleBodyType" AS ENUM ('suv', 'compact', 'sedan', 'wagon', 'van', 'sports');

-- CreateEnum
CREATE TYPE "VehicleCondition" AS ENUM ('used', 'demonstrator', 'annual');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('draft', 'available', 'reserved', 'sold', 'archived');

-- CreateEnum
CREATE TYPE "VehicleInspectionStatus" AS ENUM ('pending', 'in_progress', 'passed', 'failed');

-- CreateTable
CREATE TABLE "vehicle" (
    "id" TEXT NOT NULL,
    "stockNumber" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "marginEstimateCents" INTEGER,
    "firstRegistration" DATE NOT NULL,
    "mileage" INTEGER NOT NULL,
    "fuelType" "VehicleFuelType" NOT NULL,
    "transmissionType" "VehicleTransmissionType" NOT NULL,
    "powerKw" INTEGER NOT NULL,
    "bodyType" "VehicleBodyType" NOT NULL,
    "exteriorColor" TEXT NOT NULL,
    "consumption" DOUBLE PRECISION,
    "co2Emission" INTEGER,
    "condition" "VehicleCondition" NOT NULL,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vinLastSix" TEXT NOT NULL,
    "ownerCount" INTEGER NOT NULL DEFAULT 0,
    "status" "VehicleStatus" NOT NULL DEFAULT 'draft',
    "inspectionStatus" "VehicleInspectionStatus" NOT NULL DEFAULT 'pending',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "acquisitionDate" DATE,
    "publishedAt" TIMESTAMP(3),
    "reservedAt" TIMESTAMP(3),
    "reservedUntil" TIMESTAMP(3),
    "soldAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_stockNumber_key" ON "vehicle"("stockNumber");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_slug_key" ON "vehicle"("slug");

-- CreateIndex
CREATE INDEX "vehicle_status_isFeatured_idx" ON "vehicle"("status", "isFeatured");

-- CreateIndex
CREATE INDEX "vehicle_status_publishedAt_idx" ON "vehicle"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "vehicle_make_model_idx" ON "vehicle"("make", "model");

-- CreateIndex
CREATE INDEX "vehicle_priceCents_idx" ON "vehicle"("priceCents");

-- CreateIndex
CREATE INDEX "vehicle_mileage_idx" ON "vehicle"("mileage");

-- CreateIndex
CREATE INDEX "vehicle_updatedAt_idx" ON "vehicle"("updatedAt");

-- CreateIndex
CREATE INDEX "vehicle_updatedByUserId_idx" ON "vehicle"("updatedByUserId");

-- AddForeignKey
ALTER TABLE "vehicle" ADD CONSTRAINT "vehicle_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
