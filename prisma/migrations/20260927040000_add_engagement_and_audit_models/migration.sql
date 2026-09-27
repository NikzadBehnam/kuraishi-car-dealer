-- CreateEnum
CREATE TYPE "ActivitySeverity" AS ENUM ('info', 'success', 'warning', 'risk');

-- CreateTable
CREATE TABLE "favourite" (
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favourite_pkey" PRIMARY KEY ("userId", "vehicleId")
);

-- CreateTable
CREATE TABLE "comparison_selection" (
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comparison_selection_pkey" PRIMARY KEY ("userId", "vehicleId"),
    CONSTRAINT "comparison_selection_position_check" CHECK ("position" >= 0 AND "position" < 3)
);

-- CreateTable
CREATE TABLE "activity_event" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" "ActivitySeverity" NOT NULL DEFAULT 'info',
    "actorUserId" TEXT,
    "actorName" TEXT NOT NULL,
    "actorRole" TEXT,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_event_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "activity_event_metadata_object_check" CHECK (jsonb_typeof("metadata") = 'object')
);

-- CreateIndex
CREATE INDEX "favourite_vehicleId_idx" ON "favourite"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "comparison_selection_userId_position_key" ON "comparison_selection"("userId", "position");

-- CreateIndex
CREATE INDEX "comparison_selection_vehicleId_idx" ON "comparison_selection"("vehicleId");

-- CreateIndex
CREATE INDEX "activity_event_occurredAt_idx" ON "activity_event"("occurredAt");

-- CreateIndex
CREATE INDEX "activity_event_actorUserId_occurredAt_idx" ON "activity_event"("actorUserId", "occurredAt");

-- CreateIndex
CREATE INDEX "activity_event_type_occurredAt_idx" ON "activity_event"("type", "occurredAt");

-- CreateIndex
CREATE INDEX "activity_event_severity_occurredAt_idx" ON "activity_event"("severity", "occurredAt");

-- CreateIndex
CREATE INDEX "activity_event_targetType_targetId_occurredAt_idx" ON "activity_event"("targetType", "targetId", "occurredAt");

-- AddForeignKey
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favourite" ADD CONSTRAINT "favourite_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_selection" ADD CONSTRAINT "comparison_selection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comparison_selection" ADD CONSTRAINT "comparison_selection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_event" ADD CONSTRAINT "activity_event_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
