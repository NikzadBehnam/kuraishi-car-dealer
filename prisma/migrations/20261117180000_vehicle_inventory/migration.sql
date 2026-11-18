BEGIN;

-- CreateEnum
CREATE TYPE "VehicleCondition" AS ENUM ('used', 'demonstrator', 'annual');

-- CreateEnum
CREATE TYPE "VehicleFuelType" AS ENUM ('petrol', 'diesel', 'electric', 'hybrid');

-- CreateEnum
CREATE TYPE "VehicleTransmissionType" AS ENUM ('automatic', 'manual');

-- CreateEnum
CREATE TYPE "VehicleBodyType" AS ENUM ('suv', 'compact', 'sedan', 'wagon', 'van', 'sports');

-- CreateEnum
CREATE TYPE "VehicleConsumptionUnit" AS ENUM ('l_per_100_km', 'kwh_per_100_km');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('draft', 'published', 'reserved', 'sold', 'archived');

-- CreateEnum
CREATE TYPE "VehicleInspectionStatus" AS ENUM ('pending', 'in_progress', 'passed', 'failed');

-- CreateTable
CREATE TABLE "Dealer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "stockNumber" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "description" TEXT,
    "location" TEXT,
    "exteriorColor" TEXT,
    "condition" "VehicleCondition",
    "price" DECIMAL(12,2),
    "marginEstimate" DECIMAL(12,2),
    "firstRegistration" VARCHAR(7),
    "mileage" INTEGER,
    "powerKw" DECIMAL(7,2),
    "ownerCount" INTEGER,
    "vinLastSix" VARCHAR(6),
    "fuelType" "VehicleFuelType",
    "transmissionType" "VehicleTransmissionType",
    "bodyType" "VehicleBodyType",
    "consumption" DECIMAL(6,2),
    "consumptionUnit" "VehicleConsumptionUnit",
    "co2Emission" INTEGER,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "VehicleStatus" NOT NULL DEFAULT 'draft',
    "inspectionStatus" "VehicleInspectionStatus" NOT NULL DEFAULT 'pending',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "acquisitionDate" DATE NOT NULL,
    "publishedAt" TIMESTAMPTZ(3),
    "reservedUntil" TIMESTAMPTZ(3),
    "soldAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "dealerId" TEXT NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleChange" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL,
    "previousStatus" "VehicleStatus",
    "status" "VehicleStatus" NOT NULL,
    "previousInspectionStatus" "VehicleInspectionStatus",
    "inspectionStatus" "VehicleInspectionStatus" NOT NULL,
    "previousSoldAt" TIMESTAMPTZ(3),
    "soldAt" TIMESTAMPTZ(3),

    CONSTRAINT "VehicleChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_slug_key" ON "Vehicle"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_stockNumber_key" ON "Vehicle"("stockNumber");

-- CreateIndex
CREATE INDEX "Vehicle_dealerId_idx" ON "Vehicle"("dealerId");

-- CreateIndex
CREATE INDEX "Vehicle_updatedAt_id_idx" ON "Vehicle"("updatedAt" DESC, "id");

-- CreateIndex
CREATE INDEX "Vehicle_status_updatedAt_id_idx" ON "Vehicle"("status", "updatedAt" DESC, "id");

-- CreateIndex
CREATE INDEX "Vehicle_status_inspectionStatus_isFeatured_id_idx" ON "Vehicle"("status", "inspectionStatus", "isFeatured", "id");

-- CreateIndex
CREATE INDEX "Vehicle_createdById_idx" ON "Vehicle"("createdById");

-- CreateIndex
CREATE INDEX "Vehicle_updatedById_idx" ON "Vehicle"("updatedById");

-- CreateIndex
CREATE INDEX "VehicleChange_actorId_idx" ON "VehicleChange"("actorId");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleChange_vehicleId_version_key" ON "VehicleChange"("vehicleId", "version");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleChange" ADD CONSTRAINT "VehicleChange_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleChange" ADD CONSTRAINT "VehicleChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prisma does not represent CHECK constraints in the source schema.
ALTER TABLE "Dealer"
    ADD CONSTRAINT "Dealer_name_check" CHECK (length(btrim("name")) > 0);

ALTER TABLE "Vehicle"
    ADD CONSTRAINT "Vehicle_identity_check" CHECK (
        length(btrim("slug")) > 0 AND "slug" = btrim("slug")
        AND length(btrim("stockNumber")) > 0
        AND "stockNumber" = upper(btrim("stockNumber"))
        AND length(btrim("make")) > 0 AND length(btrim("model")) > 0
    ),
    ADD CONSTRAINT "Vehicle_money_check" CHECK (
        ("price" IS NULL OR ("price" > 0 AND "price" <> 'NaN'::numeric))
        AND ("marginEstimate" IS NULL OR (
            "marginEstimate" >= 0 AND "marginEstimate" <> 'NaN'::numeric
        ))
    ),
    ADD CONSTRAINT "Vehicle_technical_values_check" CHECK (
        ("mileage" IS NULL OR "mileage" >= 0)
        AND ("ownerCount" IS NULL OR "ownerCount" >= 0)
        AND ("powerKw" IS NULL OR ("powerKw" > 0 AND "powerKw" <> 'NaN'::numeric))
        AND ("co2Emission" IS NULL OR "co2Emission" >= 0)
        AND ("consumption" IS NULL OR (
            "consumption" >= 0 AND "consumption" <> 'NaN'::numeric
        ))
    ),
    ADD CONSTRAINT "Vehicle_registration_check" CHECK (
        "firstRegistration" IS NULL
        OR "firstRegistration" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'
    ),
    ADD CONSTRAINT "Vehicle_vin_fragment_check" CHECK (
        "vinLastSix" IS NULL OR "vinLastSix" ~ '^[A-Za-z0-9]{6}$'
    ),
    ADD CONSTRAINT "Vehicle_consumption_pair_check" CHECK (
        ("consumption" IS NULL) = ("consumptionUnit" IS NULL)
    ),
    ADD CONSTRAINT "Vehicle_consumption_fuel_check" CHECK (
        "consumption" IS NULL OR (
            "fuelType" IS NOT NULL AND (
                ("fuelType" IN ('petrol', 'diesel') AND "consumptionUnit" = 'l_per_100_km')
                OR ("fuelType" = 'electric' AND "consumptionUnit" = 'kwh_per_100_km')
                OR "fuelType" = 'hybrid'
            )
        )
    ),
    ADD CONSTRAINT "Vehicle_public_inspection_check" CHECK (
        "status" NOT IN ('published', 'reserved') OR "inspectionStatus" = 'passed'
    ),
    ADD CONSTRAINT "Vehicle_featured_check" CHECK (
        NOT "isFeatured" OR ("status" = 'published' AND "inspectionStatus" = 'passed')
    ),
    ADD CONSTRAINT "Vehicle_publication_date_check" CHECK (
        "status" NOT IN ('published', 'reserved', 'sold') OR "publishedAt" IS NOT NULL
    ),
    ADD CONSTRAINT "Vehicle_sale_date_check" CHECK (
        ("status" <> 'sold' OR "soldAt" IS NOT NULL)
        AND ("status" NOT IN ('draft', 'published', 'reserved') OR "soldAt" IS NULL)
    ),
    ADD CONSTRAINT "Vehicle_version_check" CHECK ("version" >= 1),
    ADD CONSTRAINT "Vehicle_lists_check" CHECK (
        "features" IS NOT NULL AND "labels" IS NOT NULL
        AND array_position("features", NULL) IS NULL
        AND array_position("labels", NULL) IS NULL
    );

ALTER TABLE "VehicleChange"
    ADD CONSTRAINT "VehicleChange_version_check" CHECK ("version" >= 1);

COMMIT;
