'use client';

import type { OpinionFormValue } from './validate';

/** Row in the opinions list view. */
export interface OpinionListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  scheduledAt?: string | null;
  updatedAt?: string;
}

/** Generic id/label option for the opinions author filter. */
export interface OpinionAuthorOption {
  id: string;
  label: string;
}

/** Editorial read model for a single opinion. */
export interface EditorialOpinionRead {
  id: string;
  status: string;
  scheduledAt: string | null;
  firstPublishedAt?: string | null;
  updatedAt?: string | null;
  authorId: string;
  coverMediaId: string | null;
  translations: Array<{ locale: string; slug: string; title: string; summary: string; content: string[] }>;
}

export type { OpinionFormValue };
