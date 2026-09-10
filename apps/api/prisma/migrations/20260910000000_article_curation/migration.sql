-- AlterTable: A1.3-B minimal curation (non-destructive, defaults false)
ALTER TABLE "articles" ADD COLUMN "is_breaking" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "articles" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- Partial indexes for published curated reads
CREATE INDEX "articles_published_breaking_idx" ON "articles"("published_at" DESC) WHERE "status" = 'published' AND "is_breaking";
CREATE INDEX "articles_published_featured_idx" ON "articles"("published_at" DESC) WHERE "status" = 'published' AND "is_featured";
