-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('contact', 'valuation', 'test-drive', 'callback');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'closed', 'lost');

-- CreateEnum
CREATE TYPE "LeadPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateTable
CREATE TABLE "lead" (
    "id" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'new',
    "priority" "LeadPriority" NOT NULL DEFAULT 'medium',
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "message" TEXT,
    "preferredDate" TIMESTAMP(3),
    "consentAcceptedAt" TIMESTAMP(3),
    "consentVersion" TEXT,
    "vehicleId" TEXT,
    "submittedByUserId" TEXT,
    "assignedToUserId" TEXT,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valuation_request" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "firstRegistration" DATE NOT NULL,
    "mileage" INTEGER NOT NULL,
    "conditionDescription" TEXT,
    "accidentHistory" TEXT,
    "serviceHistory" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valuation_request_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "valuation_request_mileage_nonnegative_check" CHECK ("mileage" >= 0)
);

-- CreateTable
CREATE TABLE "lead_note" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "authorUserId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_status_createdAt_idx" ON "lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "lead_assignedToUserId_status_createdAt_idx" ON "lead"("assignedToUserId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "lead_source_createdAt_idx" ON "lead"("source", "createdAt");

-- CreateIndex
CREATE INDEX "lead_priority_createdAt_idx" ON "lead"("priority", "createdAt");

-- CreateIndex
CREATE INDEX "lead_vehicleId_idx" ON "lead"("vehicleId");

-- CreateIndex
CREATE INDEX "lead_submittedByUserId_idx" ON "lead"("submittedByUserId");

-- CreateIndex
CREATE INDEX "lead_customerEmail_idx" ON "lead"("customerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "valuation_request_leadId_key" ON "valuation_request"("leadId");

-- CreateIndex
CREATE INDEX "lead_note_leadId_createdAt_idx" ON "lead_note"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "lead_note_authorUserId_idx" ON "lead_note"("authorUserId");

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead" ADD CONSTRAINT "lead_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valuation_request" ADD CONSTRAINT "valuation_request_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_note" ADD CONSTRAINT "lead_note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_note" ADD CONSTRAINT "lead_note_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
