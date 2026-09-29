'use client';

import { CONTENT_SLUG_PATTERN } from '@/shared/lib/slug';
import type { CategoryForm, CategoryFormError } from './types';

export const EMPTY_CATEGORY_FORM: CategoryForm = {
  sort: '0',
  esSlug: '',
  esLabel: '',
  esDesc: '',
  enSlug: '',
  enLabel: '',
};

/** Field errors keyed by form field; empty record means valid. */
export function validateCategoryForm(form: CategoryForm): CategoryFormError {
  const errors: CategoryFormError = {};
  const sortTrimmed = form.sort.trim();
  // Inc 1: API enforces sort >= 0 (Min(0)). Reject negatives client-side so a
  // negative never reaches the API as a generic HTTP error.
  if (sortTrimmed !== '' && (!/^-?\d+$/.test(sortTrimmed) || Number(sortTrimmed) < 0)) errors.sort = 'number';
  if (!form.esSlug.trim()) errors.esSlug = 'required';
  else if (!CONTENT_SLUG_PATTERN.test(form.esSlug.trim())) errors.esSlug = 'slug';
  if (!form.esLabel.trim()) errors.esLabel = 'required';
  if (form.enSlug.trim() || form.enLabel.trim()) {
    if (!form.enSlug.trim()) errors.enSlug = 'required';
    else if (!CONTENT_SLUG_PATTERN.test(form.enSlug.trim())) errors.enSlug = 'slug';
    if (!form.enLabel.trim()) errors.enLabel = 'required';
  }
  return errors;
}
