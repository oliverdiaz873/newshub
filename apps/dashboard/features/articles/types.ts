'use client';

import type { ArticleFormValue } from './validate';

/** Row in the articles list view. */
export interface ArticleListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  categorySlug: string;
  isBreaking: boolean;
  isFeatured: boolean;
  scheduledAt?: string | null;
  updatedAt?: string;
}

/** Generic id/label option for article list filters. */
export interface ArticleFilterOption {
  id: string;
  label: string;
}

/** Per-item result of the bulk endpoint. */
export interface ArticleBulkResult {
  id: string;
  ok: boolean;
  code?: string;
}

/** Editorial read model for a single article. */
export interface EditorialArticleRead {
  id: string;
  status: string;
  scheduledAt: string | null;
  firstPublishedAt?: string | null;
  updatedAt?: string | null;
  categoryId: string;
  authorId: string | null;
  coverMediaId: string | null;
  isBreaking: boolean;
  isFeatured: boolean;
  translations: Array<{ locale: string; slug: string; title: string; summary: string; content: string[] }>;
}

export type { ArticleFormValue };
