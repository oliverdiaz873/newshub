'use client';

/** Category row from the editorial catalog. */
export interface CategoryRow {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort: number;
  articleCount: number;
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
  Record<'sort' | 'esSlug' | 'esLabel' | 'enSlug' | 'enLabel', 'required' | 'slug' | 'number'>
>;

export interface CategoryPayload {
  sort: number;
  translations: Array<{ locale: string; slug: string; label: string; description?: string | null }>;
}
