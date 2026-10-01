'use client';

import type { MediaOption } from '../types';
import { resolveMediaUrl } from '../lib/media-url';

/**
 * Shared media thumbnail cell (manager grid + picker grid).
 * Presentational only: selection/upload/delete behavior lives with the
 * callers. The picker paginates its grid locally ("show more").
 */
export function MediaThumb({ item, width = 120, height = 80 }: { item: MediaOption; width?: number; height?: number }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={resolveMediaUrl(item.url)}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      style={{ objectFit: 'cover', borderRadius: 6 }}
    />
  );
}

export function mediaLabel(item: MediaOption): string {
  const name = item.originalFilename ?? item.mime;
  const dims = item.width && item.height ? ` · ${item.width}×${item.height}` : '';
  return `${name}${dims}`;
}

/** Human display name with MIME fallback (never renders null/undefined). */
export function mediaFilename(item: MediaOption): string {
  return item.originalFilename ?? item.mime;
}

/** Compact size label; empty string when unknown (caller omits it). */
export function formatBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
