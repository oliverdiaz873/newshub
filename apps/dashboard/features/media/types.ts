'use client';

/** Media asset option (picker + manager). */
export interface MediaOption {
  id: string;
  url: string;
  mime: string;
  width: number | null;
  height: number | null;
}

/** Manager row: option plus creation date. */
export interface MediaRow extends MediaOption {
  createdAt: string;
}
