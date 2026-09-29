'use client';

/** Category row from the editorial catalog. */
export interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort: number;
  articleCount: number;
  /** Editorial-only: true when the row fell back to ES (EN translation missing). */
  fallback?: boolean;
  /** Editorial-only: locale the row values were resolved in. */
  localeResolved?: string;
}

/** Category create/edit form state. */
export interface CategoryForm {
  sort: string;
  esSlug: string;
  esLabel: string;
  esDesc: string;
  enSlug: string;
  enLabel: string;
}

export type CategoryFormError = Partial<
  Record<'sort' | 'esSlug' | 'esLabel' | 'enSlug' | 'enLabel', 'required' | 'slug' | 'taken' | 'number'>
>;

export interface CategoryPayload {
  sort: number;
  translations: Array<{ locale: string; slug: string; label: string; description?: string | null }>;
}
