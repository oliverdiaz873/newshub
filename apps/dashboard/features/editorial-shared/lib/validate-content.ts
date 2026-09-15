/**
 * Shared bilingual content validation core (extracted from validate-article
 * in Increment 3; behavior-identical). Spanish is required; English is
 * optional and inherits Spanish when empty. Runs BEFORE any dirty-state
 * rebaseline.
 */

export const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface TranslationForm {
  slug: string;
  title: string;
  summary: string;
  content: string;
}

export type TranslationFieldKey = 'slug' | 'title' | 'summary' | 'content';

function empty(value: string): boolean {
  return value.trim().length === 0;
}

/**
 * Validates one translation form. When `required` (Spanish), slug/title/
 * summary/content are mandatory; when optional (English), slug/title are
 * validated only if provided (slug+title must come together).
 * Returns error kinds keyed by field.
 */
export function validateTranslationForm(
  form: TranslationForm,
  required: boolean,
): Partial<Record<TranslationFieldKey, 'required' | 'slug'>> {
  const errors: Partial<Record<TranslationFieldKey, 'required' | 'slug'>> = {};
  if (required || !empty(form.slug) || !empty(form.title)) {
    if (empty(form.slug)) errors.slug = 'required';
    else if (!CONTENT_SLUG_PATTERN.test(form.slug.trim())) errors.slug = 'slug';
    if (empty(form.title)) errors.title = 'required';
  }
  if (required) {
    if (empty(form.summary)) errors.summary = 'required';
    if (empty(form.content)) errors.content = 'required';
  }
  return errors;
}

export function splitParas(text: string): string[] {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/** Builds the API translations payload (EN inherits ES when empty). */
export function buildTranslations(
  es: TranslationForm,
  en: TranslationForm,
): Array<{ locale: string; slug: string; title: string; summary: string; content: string[] }> {
  const translations = [
    {
      locale: 'es',
      slug: es.slug.trim(),
      title: es.title.trim(),
      summary: es.summary.trim(),
      content: splitParas(es.content),
    },
  ];
  if (en.slug.trim() && en.title.trim()) {
    translations.push({
      locale: 'en',
      slug: en.slug.trim(),
      title: en.title.trim(),
      summary: en.summary.trim() || es.summary.trim(),
      content: splitParas(en.content).length > 0 ? splitParas(en.content) : splitParas(es.content),
    });
  }
  return translations;
}
