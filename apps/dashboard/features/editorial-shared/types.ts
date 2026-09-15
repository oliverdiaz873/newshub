'use client';

/**
 * Shared editorial option type (author/category dropdown options).
 * Owned by editorial-shared: used by both ArticleEditor and OpinionEditor.
 * Moved here to break the OpinionEditor -> ArticleEditor dependency.
 */
export interface EditorOption {
  id: string;
  label: string;
}
