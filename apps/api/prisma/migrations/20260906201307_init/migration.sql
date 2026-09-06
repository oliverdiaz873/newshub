-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authors" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "author_translations" (
    "author_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,

    CONSTRAINT "author_translations_pkey" PRIMARY KEY ("author_id","locale")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_translations" (
    "category_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "category_translations_pkey" PRIMARY KEY ("category_id","locale")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "author_id" UUID,
    "cover_media_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_translations" (
    "article_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "cover_alt" TEXT,
    "content" JSONB NOT NULL,

    CONSTRAINT "article_translations_pkey" PRIMARY KEY ("article_id","locale")
);

-- CreateTable
CREATE TABLE "opinions" (
    "id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "cover_media_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "published_at" TIMESTAMPTZ,
    "created_by" UUID,
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "opinions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opinion_translations" (
    "opinion_id" UUID NOT NULL,
    "locale" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "cover_alt" TEXT,
    "content" JSONB NOT NULL,

    CONSTRAINT "opinion_translations_pkey" PRIMARY KEY ("opinion_id","locale")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "author_translations_locale_name_key" ON "author_translations"("locale", "name");

-- CreateIndex
CREATE UNIQUE INDEX "category_translations_locale_slug_key" ON "category_translations"("locale", "slug");

-- CreateIndex
CREATE INDEX "articles_author_id_idx" ON "articles"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "article_translations_locale_slug_key" ON "article_translations"("locale", "slug");

-- CreateIndex
CREATE INDEX "opinions_author_id_idx" ON "opinions"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "opinion_translations_locale_slug_key" ON "opinion_translations"("locale", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_storage_key_key" ON "media_assets"("storage_key");

-- AddForeignKey
ALTER TABLE "author_translations" ADD CONSTRAINT "author_translations_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_cover_media_id_fkey" FOREIGN KEY ("cover_media_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opinion_translations" ADD CONSTRAINT "opinion_translations_opinion_id_fkey" FOREIGN KEY ("opinion_id") REFERENCES "opinions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Data Model v2: domain CHECKs (Prisma has no native CHECK support; raw SQL is
-- stable under `migrate dev` because the diff engine leaves them alone, while
-- plain single-column indexes live in the schema via @@index instead).
ALTER TABLE "users" ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('admin', 'editor'));
ALTER TABLE "author_translations" ADD CONSTRAINT "author_translations_locale_check" CHECK ("locale" IN ('es', 'en'));
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_locale_check" CHECK ("locale" IN ('es', 'en'));
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_locale_check" CHECK ("locale" IN ('es', 'en'));
ALTER TABLE "opinion_translations" ADD CONSTRAINT "opinion_translations_locale_check" CHECK ("locale" IN ('es', 'en'));
ALTER TABLE "authors" ADD CONSTRAINT "authors_slug_check" CHECK ("slug" ~ '^[a-z0-9-]{3,120}$');
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_slug_check" CHECK ("slug" ~ '^[a-z0-9-]{3,120}$');
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_slug_check" CHECK ("slug" ~ '^[a-z0-9-]{3,120}$');
ALTER TABLE "opinion_translations" ADD CONSTRAINT "opinion_translations_slug_check" CHECK ("slug" ~ '^[a-z0-9-]{3,120}$');
ALTER TABLE "articles" ADD CONSTRAINT "articles_status_check" CHECK ("status" IN ('draft', 'review', 'published', 'archived'));
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_status_check" CHECK ("status" IN ('draft', 'review', 'published', 'archived'));
ALTER TABLE "articles" ADD CONSTRAINT "articles_published_at_check" CHECK (("status" = 'published' AND "published_at" IS NOT NULL) OR ("status" <> 'published'));
ALTER TABLE "opinions" ADD CONSTRAINT "opinions_published_at_check" CHECK (("status" = 'published' AND "published_at" IS NOT NULL) OR ("status" <> 'published'));
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_content_check" CHECK (jsonb_typeof("content") = 'array' AND jsonb_array_length("content") > 0);
ALTER TABLE "opinion_translations" ADD CONSTRAINT "opinion_translations_content_check" CHECK (jsonb_typeof("content") = 'array' AND jsonb_array_length("content") > 0);

-- Data Model v2: public-read partial indexes (not expressible in Prisma schema)
CREATE INDEX "articles_status_published_at_idx" ON "articles"("status", "published_at" DESC) WHERE "status" = 'published';
CREATE INDEX "articles_category_published_idx" ON "articles"("category_id", "status", "published_at" DESC) WHERE "status" = 'published';
CREATE INDEX "opinions_status_published_at_idx" ON "opinions"("status", "published_at" DESC) WHERE "status" = 'published';
