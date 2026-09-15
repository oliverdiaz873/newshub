/**
 * Article form validation (Increment 3: thin wrapper over the shared
 * validate-content core; behavior-identical to the Increment 1 version).
 */

import {
  buildTranslations as buildSharedTranslations,
  splitParas as sharedSplitParas,
  validateTranslationForm,
  type TranslationForm,
} from '@/features/editorial-shared/lib/validate-content';

export { CONTENT_SLUG_PATTERN as ARTICLE_SLUG_PATTERN } from '@/features/editorial-shared/lib/validate-content';
export type { TranslationForm };

export interface ArticleFormValue {
  categoryId: string;
  authorId: string;
  coverMediaId: string;
  isBreaking: boolean;
  isFeatured: boolean;
  es: TranslationForm;
  en: TranslationForm;
}

export type FieldKey =
  | 'categoryId'
  | 'es.slug'
  | 'es.title'
  | 'es.summary'
  | 'es.content'
  | 'en.slug'
  | 'en.title';

export const ARTICLE_FIELD_ORDER: FieldKey[] = [
  'categoryId',
  'es.slug',
  'es.title',
  'es.summary',
  'es.content',
  'en.slug',
  'en.title',
];

function empty(value: string): boolean {
  return value.trim().length === 0;
}

/** Field errors keyed by FieldKey; empty record means valid. */
export function validateArticleForm(value: ArticleFormValue): Partial<Record<FieldKey, 'required' | 'slug'>> {
  const errors: Partial<Record<FieldKey, 'required' | 'slug'>> = {};
  if (empty(value.categoryId)) errors.categoryId = 'required';
  const es = validateTranslationForm(value.es, true);
  if (es.slug) errors['es.slug'] = es.slug;
  if (es.title) errors['es.title'] = es.title;
  if (es.summary) errors['es.summary'] = es.summary;
  if (es.content) errors['es.content'] = es.content;
  const en = validateTranslationForm(value.en, false);
  if (en.slug) errors['en.slug'] = en.slug;
  if (en.title) errors['en.title'] = en.title;
  return errors;
}

export function splitParas(text: string): string[] {
  return sharedSplitParas(text);
}

/** Builds the API translations payload (EN inherits ES when empty). */
export function buildTranslations(value: ArticleFormValue): Array<{
  locale: string;
  slug: string;
  title: string;
  summary: string;
  content: string[];
}> {
  return buildSharedTranslations(value.es, value.en);
}
