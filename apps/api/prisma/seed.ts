/* eslint-disable no-console */
/**
 * F1 seed: loads ES editorial content from the storefront static data layer
 * (apps/storefront/src/data) into PostgreSQL. ES rows only — no EN content is
 * invented; EN fallback is resolved at the API layer. Re-runnable: truncates
 * the editorial tables first for a clean, reproducible seed.
 *
 * Run: npm run prisma:seed (DATABASE_URL must point at the target database)
 */
import { PrismaClient } from '@prisma/client';
import { newsArticles } from '../../storefront/src/data/categories';
import { opinionArticles } from '../../storefront/src/data/opinionArticles';
import { opinionDetails } from '../../storefront/src/data/opinionDetails';
import { politicaArticles } from '../../storefront/src/data/articleContent/politica';
import { deporteArticles } from '../../storefront/src/data/articleContent/deporte';
import { economiaArticles } from '../../storefront/src/data/articleContent/economia';
import { internacionalArticles } from '../../storefront/src/data/articleContent/internacional';
import { justiciaArticles } from '../../storefront/src/data/articleContent/justicia';
import { climaArticles } from '../../storefront/src/data/articleContent/clima';
import { saludArticles } from '../../storefront/src/data/articleContent/salud';
import type { FullNewsArticle, NewsArticle } from '../../storefront/src/data/newsModels';

const prisma = new PrismaClient();
const LOCALE = 'es';
const STAFF_SLUG = 'redaccion';

const CATEGORY_ORDER = [
  'politica',
  'internacional',
  'economia',
  'salud',
  'deporte',
  'clima',
  'justicia',
] as const;

const CATEGORY_META: Record<string, { label: string; description: string }> = {
  politica: {
    label: 'Política',
    description:
      'Cobertura sobre gobierno, poder legislativo, partidos, transparencia y decisiones públicas con impacto nacional.',
  },
  internacional: {
    label: 'Internacional',
    description:
      'Panorama global con enfoque en diplomacia, conflictos, alianzas estrategicas y movimientos geopoliticos clave.',
  },
  economia: {
    label: 'Economía',
    description:
      'Mercados, inflación, empresas, empleo y decisiones financieras que marcan el ritmo económico del país y el mundo.',
  },
  salud: {
    label: 'Salud',
    description:
      'Información sobre sistema sanitario, prevención, investigación médica y tendencias que impactan el bienestar colectivo.',
  },
  deporte: {
    label: 'Deporte',
    description:
      'Actualidad deportiva con foco en resultados, figuras, torneos y el pulso competitivo de las principales disciplinas.',
  },
  clima: {
    label: 'Clima',
    description:
      'Seguimiento meteorológico, alertas, fenómenos extremos y efectos ambientales en comunidades y sectores productivos.',
  },
  justicia: {
    label: 'Justicia',
    description:
      'Procesos judiciales, investigación de delitos, reformas legales y decisiones institucionales en materia de justicia.',
  },
};

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
  await prisma.$executeRawUnsafe(
    'TRUNCATE "users", "authors", "categories", "articles", "opinions", "media_assets" RESTART IDENTITY CASCADE',
  );

  const admin = await prisma.user.create({
    data: { email: 'admin@newshub.local', displayName: 'Admin', role: 'admin' },
  });
  await prisma.user.create({
    data: { email: 'editor@newshub.local', displayName: 'Editor', role: 'editor' },
  });

  const staff = await prisma.author.create({ data: { slug: STAFF_SLUG } });
  await prisma.authorTranslation.create({
    data: { authorId: staff.id, locale: LOCALE, name: 'Redacción', bio: null },
  });

  const fullById = new Map<string, FullNewsArticle>();
  for (const list of [
    politicaArticles,
    deporteArticles,
    economiaArticles,
    internacionalArticles,
    justiciaArticles,
    climaArticles,
    saludArticles,
  ]) {
    for (const full of list) fullById.set(full.id, full);
  }

  const imagePaths = new Set<string>();
  for (const article of newsArticles as NewsArticle[]) imagePaths.add(article.imageUrl);
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
    categoryIds.set(slug, row.id);
  }

  let articleCount = 0;
  for (const article of newsArticles as NewsArticle[]) {
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
    opinionCount++;
  }

  console.log(
    `Seed complete: ${CATEGORY_ORDER.length} categories, ${articleCount} articles, ${opinionCount} opinions, ${mediaByPath.size} media assets (locale ${LOCALE}).`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
