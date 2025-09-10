-- AlterTable
ALTER TABLE "public"."posts" ADD COLUMN     "store_name" TEXT,
ADD COLUMN     "store_url" TEXT;

-- CreateTable
CREATE TABLE "public"."used_stores" (
    "id" TEXT NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "store_name" TEXT NOT NULL,
    "store_url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "used_stores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "used_stores_workspace_id_idx" ON "public"."used_stores"("workspace_id");

-- CreateIndex
CREATE INDEX "used_stores_schedule_id_idx" ON "public"."used_stores"("schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "used_stores_workspace_id_store_name_schedule_id_key" ON "public"."used_stores"("workspace_id", "store_name", "schedule_id");

-- AddForeignKey
ALTER TABLE "public"."used_stores" ADD CONSTRAINT "used_stores_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."used_stores" ADD CONSTRAINT "used_stores_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."post_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
