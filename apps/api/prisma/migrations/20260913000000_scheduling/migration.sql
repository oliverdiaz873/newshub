-- AlterTable: scheduling (non-destructive, nullable, review-only publishing)
ALTER TABLE "articles" ADD COLUMN "scheduled_at" TIMESTAMPTZ;
ALTER TABLE "articles" ADD COLUMN "scheduled_by" UUID;
ALTER TABLE "articles" ADD CONSTRAINT "articles_scheduled_by_fkey" FOREIGN KEY ("scheduled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial index for due-schedule polling
CREATE INDEX "articles_scheduled_idx" ON "articles"("status", "scheduled_at") WHERE "scheduled_at" IS NOT NULL;

ALTER TABLE "opinions" ADD COLUMN "scheduled_at" TIMESTAMPTZ;
ALTER TABLE "opinions" ADD COLUMN "scheduled_by" UUID;
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_scheduled_by_fkey" FOREIGN KEY ("scheduled_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "opinions_scheduled_idx" ON "opinions"("status", "scheduled_at") WHERE "scheduled_at" IS NOT NULL;
