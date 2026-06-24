-- AlterTable
ALTER TABLE "events" ADD COLUMN "organization_id" INTEGER;

-- CreateIndex
CREATE INDEX "events_organization_id_idx" ON "events"("organization_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
