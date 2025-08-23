-- CreateEnum
CREATE TYPE "public"."JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."PostGenerationProgress" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "completed" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostGenerationProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PostGenerationJob" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "socialAccountIds" TEXT[],
    "userId" TEXT NOT NULL,
    "status" "public"."JobStatus" NOT NULL DEFAULT 'PENDING',
    "retries" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PostGenerationProgress_scheduleId_key" ON "public"."PostGenerationProgress"("scheduleId");

-- CreateIndex
CREATE INDEX "PostGenerationJob_scheduleId_status_idx" ON "public"."PostGenerationJob"("scheduleId", "status");

-- AddForeignKey
ALTER TABLE "public"."PostGenerationProgress" ADD CONSTRAINT "PostGenerationProgress_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."post_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PostGenerationJob" ADD CONSTRAINT "PostGenerationJob_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "public"."post_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
