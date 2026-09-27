/**
 * Opinion form validation (thin wrapper over the shared validate-content
 * core). Author is required; no category, no curation flags by design.
 */

import { validateTranslationForm, type TranslationForm } from '@/features/editorial-shared/lib/validate-content';

export type { TranslationForm };

export interface OpinionFormValue {
  authorId: string;
  coverMediaId: string;
  es: TranslationForm;
  en: TranslationForm;
}

export type OpinionFieldKey =
  | 'authorId'
  | 'es.slug'
  | 'es.title'
  | 'es.summary'
  | 'es.content'
  | 'en.slug'
  | 'en.title'
  | 'en.summary';

export const OPINION_FIELD_ORDER: OpinionFieldKey[] = [
  'authorId',
  'es.slug',
  'es.title',
  'es.summary',
  'es.content',
  'en.slug',
  'en.title',
  'en.summary',
];

function empty(value: string): boolean {
  return value.trim().length === 0;
}

/** Field errors keyed by OpinionFieldKey; empty record means valid. */
export function validateOpinionForm(value: OpinionFormValue): Partial<Record<OpinionFieldKey, 'required' | 'slug' | 'summaryMin' | 'summaryMax'>> {
  const errors: Partial<Record<OpinionFieldKey, 'required' | 'slug' | 'summaryMin' | 'summaryMax'>> = {};
  if (empty(value.authorId)) errors.authorId = 'required';
  const es = validateTranslationForm(value.es, true, true);
  if (es.slug) errors['es.slug'] = es.slug;
  if (es.title) errors['es.title'] = es.title;
  if (es.summary) errors['es.summary'] = es.summary;
  if (es.content) errors['es.content'] = es.content;
  const en = validateTranslationForm(value.en, false, true);
  if (en.slug) errors['en.slug'] = en.slug;
  if (en.title) errors['en.title'] = en.title;
  if (en.summary) errors['en.summary'] = en.summary;
  return errors;
}
