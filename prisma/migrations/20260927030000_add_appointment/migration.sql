-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('test_drive', 'consultation', 'valuation', 'workshop', 'callback');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('requested', 'confirmed', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "appointment" (
    "id" TEXT NOT NULL,
    "type" "AppointmentType" NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'requested',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "notes" TEXT,
    "vehicleId" TEXT,
    "leadId" TEXT,
    "requestedByUserId" TEXT,
    "assignedToUserId" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "appointment_window_check" CHECK ("endsAt" > "startsAt")
);

-- CreateIndex
CREATE INDEX "appointment_startsAt_idx" ON "appointment"("startsAt");

-- CreateIndex
CREATE INDEX "appointment_status_startsAt_idx" ON "appointment"("status", "startsAt");

-- CreateIndex
CREATE INDEX "appointment_type_startsAt_idx" ON "appointment"("type", "startsAt");

-- CreateIndex
CREATE INDEX "appointment_assignedToUserId_startsAt_idx" ON "appointment"("assignedToUserId", "startsAt");

-- CreateIndex
CREATE INDEX "appointment_vehicleId_idx" ON "appointment"("vehicleId");

-- CreateIndex
CREATE INDEX "appointment_leadId_idx" ON "appointment"("leadId");

-- CreateIndex
CREATE INDEX "appointment_requestedByUserId_idx" ON "appointment"("requestedByUserId");

-- CreateIndex
CREATE INDEX "appointment_customerEmail_idx" ON "appointment"("customerEmail");

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
