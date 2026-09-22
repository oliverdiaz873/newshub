-- M-02 (data-model-physical-plan): locales as data (D5).
-- Replaces the four locale CHECKs with a locales table + FKs.
-- Pre-flight (must return 0 rows before applying):
--   SELECT DISTINCT locale FROM <each>_translations WHERE locale NOT IN ('es','en');

CREATE TABLE "locales" (
  "code" TEXT NOT NULL,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "locales_pkey" PRIMARY KEY ("code"),
  CONSTRAINT "locales_code_check" CHECK ("code" ~ '^[a-z]{2}$')
);

INSERT INTO "locales" ("code", "is_default") VALUES ('es', true), ('en', false);

CREATE UNIQUE INDEX "locales_single_default" ON "locales" ("is_default") WHERE "is_default";

ALTER TABLE "author_translations" ADD CONSTRAINT "author_translations_locale_fk" FOREIGN KEY ("locale") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_locale_fk" FOREIGN KEY ("locale") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_locale_fk" FOREIGN KEY ("locale") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "opinion_translations" ADD CONSTRAINT "opinion_translations_locale_fk" FOREIGN KEY ("locale") REFERENCES "locales"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "author_translations" DROP CONSTRAINT "author_translations_locale_check";
ALTER TABLE "category_translations" DROP CONSTRAINT "category_translations_locale_check";
ALTER TABLE "article_translations" DROP CONSTRAINT "article_translations_locale_check";
ALTER TABLE "opinion_translations" DROP CONSTRAINT "opinion_translations_locale_check";
