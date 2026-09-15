'use client';

/** Author row from the editorial list. */
export interface AuthorRow {
  id: string;
  slug: string;
  translations: Array<{ locale: string; name: string; bio: string | null }>;
}

/** Author create/edit form state. */
export interface AuthorForm {
  slug: string;
  esName: string;
  esBio: string;
  enName: string;
  enBio: string;
}

export type AuthorFormError = Partial<Record<'slug' | 'esName' | 'enName', 'required' | 'slug'>>;

export interface AuthorPayload {
  slug: string;
  translations: Array<{ locale: string; name: string; bio: string | null }>;
}
