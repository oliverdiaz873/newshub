'use client';

import { CONTENT_SLUG_PATTERN } from '@/shared/lib/slug';
import type { AuthorForm, AuthorFormError } from './types';

export const EMPTY_AUTHOR_FORM: AuthorForm = { slug: '', esName: '', esBio: '', enName: '', enBio: '' };

/** Field errors keyed by form field; empty record means valid. */
export function validateAuthorForm(form: AuthorForm): AuthorFormError {
  const errors: AuthorFormError = {};
  if (!form.slug.trim()) errors.slug = 'required';
  else if (!CONTENT_SLUG_PATTERN.test(form.slug.trim())) errors.slug = 'slug';
  if (!form.esName.trim()) errors.esName = 'required';
  if (form.enName.trim() || form.enBio.trim()) {
    if (!form.enName.trim()) errors.enName = 'required';
  }
  return errors;
}
