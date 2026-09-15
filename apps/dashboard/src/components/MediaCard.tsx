'use client';

export interface MediaOption {
  id: string;
  url: string;
  mime: string;
  width: number | null;
  height: number | null;
}

/**
 * Shared media thumbnail cell (manager grid + picker grid).
 * Presentational only: selection/upload/delete behavior lives with the
 * callers, so MediaPicker conduct is frozen (including its slice cap).
 */
export function MediaThumb({ item, width = 120, height = 80 }: { item: MediaOption; width?: number; height?: number }) {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={item.url}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      style={{ objectFit: 'cover', borderRadius: 6 }}
    />
  );
}

export function mediaLabel(item: MediaOption): string {
  const dims = item.width && item.height ? ` · ${item.width}×${item.height}` : '';
  return `${item.mime}${dims}`;
}
