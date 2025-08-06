/*
  Warnings:

  - A unique constraint covering the columns `[name,is_system]` on the table `roles` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "roles_name_is_system_key" ON "public"."roles"("name", "is_system");
