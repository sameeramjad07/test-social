/*
  Warnings:

  - A unique constraint covering the columns `[ai_generation_id]` on the table `post_images` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."AIGenerationType" AS ENUM ('TEXT', 'IMAGE');

-- CreateEnum
CREATE TYPE "public"."AIGenerationStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- AlterTable
ALTER TABLE "public"."post_images" ADD COLUMN     "ai_generation_id" TEXT;

-- CreateTable
CREATE TABLE "public"."ai_generation_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "post_id" TEXT,
    "schedule_id" TEXT,
    "type" "public"."AIGenerationType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "tokens" INTEGER,
    "imageSize" TEXT,
    "duration" DOUBLE PRECISION NOT NULL,
    "status" "public"."AIGenerationStatus" NOT NULL DEFAULT 'PROCESSING',
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "image_id" TEXT,

    CONSTRAINT "ai_generation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_generation_logs_image_id_key" ON "public"."ai_generation_logs"("image_id");

-- CreateIndex
CREATE INDEX "ai_generation_logs_user_id_idx" ON "public"."ai_generation_logs"("user_id");

-- CreateIndex
CREATE INDEX "ai_generation_logs_workspace_id_idx" ON "public"."ai_generation_logs"("workspace_id");

-- CreateIndex
CREATE INDEX "ai_generation_logs_post_id_idx" ON "public"."ai_generation_logs"("post_id");

-- CreateIndex
CREATE INDEX "ai_generation_logs_schedule_id_idx" ON "public"."ai_generation_logs"("schedule_id");

-- CreateIndex
CREATE INDEX "ai_generation_logs_image_id_idx" ON "public"."ai_generation_logs"("image_id");

-- CreateIndex
CREATE INDEX "ai_generation_logs_created_at_idx" ON "public"."ai_generation_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "post_images_ai_generation_id_key" ON "public"."post_images"("ai_generation_id");

-- CreateIndex
CREATE INDEX "post_images_ai_generation_id_idx" ON "public"."post_images"("ai_generation_id");

-- AddForeignKey
ALTER TABLE "public"."ai_generation_logs" ADD CONSTRAINT "ai_generation_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_generation_logs" ADD CONSTRAINT "ai_generation_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_generation_logs" ADD CONSTRAINT "ai_generation_logs_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_generation_logs" ADD CONSTRAINT "ai_generation_logs_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."post_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_generation_logs" ADD CONSTRAINT "ai_generation_logs_image_id_fkey" FOREIGN KEY ("image_id") REFERENCES "public"."post_images"("id") ON DELETE SET NULL ON UPDATE CASCADE;
