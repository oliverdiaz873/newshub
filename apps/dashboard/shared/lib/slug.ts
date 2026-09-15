'use client';

/**
 * Shared slug pattern for content identifiers (categories, authors, articles...).
 * Domain-agnostic: lowercase letters, numbers and hyphens only.
 * Owned by shared/lib so features don't reach into editorial-shared for it.
 */
export const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
