/**
 * Seed: loads ES + EN editorial content from the API-owned seed-data directory
 * (apps/api/prisma/seed-data) into PostgreSQL. EN rows come exclusively from
 * the traceable editorial source (messages/en.json REAL_TRANSLATIONS,
 * frozen into articles.en.json / opinions.en.json / categories.en.json);
 * nothing is invented. Categories EN carry translated labels and approved
 * EN descriptions (Feature 2); author EN has no source yet
 * and stays ES-only (pending). EN fallback remains at the API layer only as
 * a transitory mechanism. Re-runnable: truncates the editorial tables first
 * for a clean, reproducible seed.
 *
 * Ownership: seed-data/*.json is the single source for seed content.
 * apps/storefront/src/data/* is legacy and coexists temporarily during the
 * migration, but it is NO LONGER consumed by this seed. Deletion of legacy
 * files happens only after 0 consumers are proven (A1.8 quarantine).
 *
 * Run: npm run prisma:seed (DATABASE_URL must point at the target database)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaClient } from '@prisma/client';
import { assertSeedAllowed, describeSeedTarget } from '../src/common/seed-guard';
import { hashPassword } from '../src/modules/auth/password';

interface SeedNewsArticle {
  id: string;
  title: string;
  href: string;
  category: string;
  date: string;
  datetime: string;
  summary: string;
  imageUrl: string;
  alt: string;
  isBreaking?: boolean;
  isFeatured?: boolean;
}

interface SeedFullArticle extends SeedNewsArticle {
  content: string[];
}

interface SeedOpinionArticle {
  id: string;
  slug?: string;
  title: string;
  href: string;
  summary: string;
  imageUrl: string;
  alt: string;
  datetime: string;
}

interface SeedOpinionDetail {
  content: string[];
}

interface SeedArticleEn {
  id: string;
  title: string;
  summary: string;
  coverAlt: string | null;
  content: string[];
}

interface SeedOpinionEn {
  id: string;
  title: string;
  summary: string;
  coverAlt: string | null;
  content: string[];
}

interface SeedCategoriesEn {
  order: string[];
  labels: Record<string, string>;
  descriptions?: Record<string, string>;
}

const SEED_DIR = join(__dirname, 'seed-data');

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(SEED_DIR, name), 'utf8')) as T;
}

const prisma = new PrismaClient();
const LOCALE = 'es';
const LOCALE_EN = 'en';
const STAFF_SLUG = 'redaccion';

interface SeedCategories {
  order: string[];
  meta: Record<string, { label: string; description: string }>;
}

const { order: CATEGORY_ORDER, meta: CATEGORY_META } = loadJson<SeedCategories>('categories.json');
const newsArticles = loadJson<SeedNewsArticle[]>('articles.json');
const opinionArticles = loadJson<SeedOpinionArticle[]>('opinions.json');
const opinionDetails = loadJson<Record<string, SeedOpinionDetail>>('opinion-details.json');
const allFullArticles = loadJson<SeedFullArticle[]>('article-contents.json');
const articlesEn = loadJson<SeedArticleEn[]>('articles.en.json');
const opinionsEn = loadJson<SeedOpinionEn[]>('opinions.en.json');
const categoriesEn = loadJson<SeedCategoriesEn>('categories.en.json');
const articlesEnById = new Map<string, SeedArticleEn>();
for (const row of articlesEn) articlesEnById.set(row.id, row);
const opinionsEnById = new Map<string, SeedOpinionEn>();
for (const row of opinionsEn) opinionsEnById.set(row.id, row);

function mimeOf(path: string): string {
  if (path.endsWith('.avif')) return 'image/avif';
  if (path.endsWith('.png')) return 'image/png';
  return 'image/jpeg';
}

function slugOf(href: string): string {
  const parts = href.split('/').filter(Boolean);
  return parts[parts.length - 1];
}

function atNoon(datetime: string): Date {
  return new Date(`${datetime}T12:00:00.000Z`);
}

async function main() {
  // M9: before any connection or destructive statement.
  assertSeedAllowed();
  console.log(`Seed target: ${describeSeedTarget(process.env.DATABASE_URL)}`);
  await prisma.$executeRawUnsafe(
    'TRUNCATE "users", "authors", "categories", "articles", "opinions", "media_assets", "user_credentials", "refresh_tokens", "revisions", "audit_events", "notifications", "notification_prefs", "planning_items", "webhooks", "webhook_deliveries" RESTART IDENTITY CASCADE',
  );

  const admin = await prisma.user.create({
    data: { email: 'admin@newshub.local', displayName: 'Admin', role: 'admin' },
  });
  await prisma.user.create({
    data: { email: 'editor@newshub.local', displayName: 'Editor', role: 'editor' },
  });
  await prisma.user.create({
    data: { email: 'reviewer@newshub.local', displayName: 'Reviewer', role: 'reviewer' },
  });
  // Dev-only credentials (documented, never production secrets).
  await prisma.userCredential.create({
    data: { userId: admin.id, passwordHash: await hashPassword('Admin123!') },
  });
  const editor = await prisma.user.findUniqueOrThrow({ where: { email: 'editor@newshub.local' } });
  await prisma.userCredential.create({
    data: { userId: editor.id, passwordHash: await hashPassword('Editor123!') },
  });
  const reviewer = await prisma.user.findUniqueOrThrow({ where: { email: 'reviewer@newshub.local' } });
  await prisma.userCredential.create({
    data: { userId: reviewer.id, passwordHash: await hashPassword('Reviewer123!') },
  });

  const staff = await prisma.author.create({ data: { slug: STAFF_SLUG } });
  await prisma.authorTranslation.create({
    data: { authorId: staff.id, locale: LOCALE, name: 'Redacción', bio: null },
  });

  const fullById = new Map<string, SeedFullArticle>();
  for (const full of allFullArticles) fullById.set(full.id, full);

  const imagePaths = new Set<string>();
  for (const article of newsArticles) imagePaths.add(article.imageUrl);
  for (const opinion of opinionArticles) imagePaths.add(opinion.imageUrl);

  const mediaByPath = new Map<string, string>();
  for (const path of imagePaths) {
    const row = await prisma.mediaAsset.create({
      data: { storageKey: path, mime: mimeOf(path), createdById: admin.id },
    });
    mediaByPath.set(path, row.id);
  }

  const categoryIds = new Map<string, string>();
  for (const [index, slug] of CATEGORY_ORDER.entries()) {
    const meta = CATEGORY_META[slug];
    const row = await prisma.category.create({
      data: { sort: index, createdById: admin.id, updatedById: admin.id },
    });
    await prisma.categoryTranslation.create({
      data: {
        categoryId: row.id,
        locale: LOCALE,
        slug,
        label: meta.label,
        description: meta.description,
      },
    });
    const labelEn = categoriesEn.labels[slug];
    if (labelEn) {
      await prisma.categoryTranslation.create({
        data: {
          categoryId: row.id,
          locale: LOCALE_EN,
          slug,
          label: labelEn,
          description: categoriesEn.descriptions?.[slug] ?? null,
        },
      });
    }
    categoryIds.set(slug, row.id);
  }

  let articleCount = 0;
  for (const article of newsArticles) {
    const segments = article.href.split('/').filter(Boolean);
    const categorySlug = segments[1];
    const categoryId = categoryIds.get(categorySlug);
    if (!categoryId) {
      console.warn(`Skipping article without known category: ${article.href}`);
      continue;
    }
    const full = fullById.get(article.id);
    const row = await prisma.article.create({
      data: {
        categoryId,
        authorId: null,
        coverMediaId: mediaByPath.get(article.imageUrl) ?? null,
        status: 'published',
        publishedAt: atNoon(article.datetime),
        createdAt: atNoon(article.datetime),
        isBreaking: article.isBreaking ?? false,
        isFeatured: article.isFeatured ?? false,
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    await prisma.articleTranslation.create({
      data: {
        articleId: row.id,
        locale: LOCALE,
        slug: slugOf(article.href),
        title: article.title,
        summary: article.summary,
        coverAlt: article.alt,
        content: full ? full.content : [article.summary],
      },
    });
    const articleEn = articlesEnById.get(article.id);
    if (articleEn) {
      await prisma.articleTranslation.create({
        data: {
          articleId: row.id,
          locale: LOCALE_EN,
          slug: slugOf(article.href),
          title: articleEn.title,
          summary: articleEn.summary,
          coverAlt: articleEn.coverAlt,
          content: articleEn.content,
        },
      });
    }
    articleCount++;
  }

  let opinionCount = 0;
  for (const opinion of opinionArticles) {
    const detail = opinionDetails[opinion.id];
    const row = await prisma.opinion.create({
      data: {
        authorId: staff.id,
        coverMediaId: mediaByPath.get(opinion.imageUrl) ?? null,
        status: 'published',
        publishedAt: atNoon(opinion.datetime),
        createdAt: atNoon(opinion.datetime),
        createdById: admin.id,
        updatedById: admin.id,
      },
    });
    await prisma.opinionTranslation.create({
      data: {
        opinionId: row.id,
        locale: LOCALE,
        slug: opinion.slug ?? slugOf(opinion.href),
        title: opinion.title,
        summary: opinion.summary,
        coverAlt: opinion.alt,
        content: detail ? detail.content : [opinion.summary],
      },
    });
    const opinionEn = opinionsEnById.get(opinion.id);
    if (opinionEn) {
      await prisma.opinionTranslation.create({
        data: {
          opinionId: row.id,
          locale: LOCALE_EN,
          slug: opinion.slug ?? slugOf(opinion.href),
          title: opinionEn.title,
          summary: opinionEn.summary,
          coverAlt: opinionEn.coverAlt,
          content: opinionEn.content,
        },
      });
    }
    opinionCount++;
  }

  const firstCategoryId = categoryIds.get(CATEGORY_ORDER[0]);
  await prisma.planningItem.create({
    data: {
      type: 'pitch',
      title: 'Cobertura elecciones locales',
      description: 'Propuesta de cobertura especial.',
      categoryId: firstCategoryId ?? null,
      priority: 'high',
      status: 'pitched',
      dueAt: new Date(Date.now() + 7 * 24 * 3600_000),
      createdById: editor.id,
      updatedById: editor.id,
    },
  });
  await prisma.planningItem.create({
    data: {
      type: 'assignment',
      title: 'Entrevista ministra de salud',
      description: 'Asignada a la editora.',
      categoryId: firstCategoryId ?? null,
      assigneeId: editor.id,
      reviewerId: reviewer.id,
      priority: 'normal',
      status: 'assigned',
      dueAt: new Date(Date.now() + 3 * 24 * 3600_000),
      createdById: admin.id,
      updatedById: admin.id,
    },
  });

  console.log(
    `Seed complete: ${CATEGORY_ORDER.length} categories, ${articleCount} articles, ${opinionCount} opinions, ${mediaByPath.size} media assets, 2 planning items (locales es+en; author EN pending).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
