'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/shared/api/auth';

export interface NavCounts {
  articles?: number;
  opinions?: number;
  categories?: number;
  authors?: number;
  media?: number;
}

function pickTotal(json: unknown): number | undefined {
  if (typeof json !== 'object' || json === null) return undefined;
  const obj = json as Record<string, unknown>;
  const meta = obj.meta as Record<string, unknown> | undefined;
  if (meta && typeof meta.total === 'number') return meta.total;
  const data = obj.data;
  if (Array.isArray(data)) return data.length;
  if (Array.isArray(json)) return (json as unknown[]).length;
  return undefined;
}

async function fetchTotal(
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>,
  path: string,
): Promise<number | undefined> {
  try {
    const res = await apiFetch(path);
    if (!res.ok) return undefined;
    return pickTotal(await res.json());
  } catch {
    return undefined;
  }
}

/**
 * App-layer nav counts (composition concern, not a feature service).
 * Best-effort Tier-1 totals for sidebar badges; failures stay undefined
 * so no badge renders. Mirrors OverviewBoard's limit=1 meta.total pattern.
 */
export function useNavCounts(): NavCounts {
  const { apiFetch, user, ready } = useAuth();
  const [counts, setCounts] = useState<NavCounts>({});

  useEffect(() => {
    if (!ready || !user) return;
    let cancelled = false;
    void (async () => {
      const [articles, opinions, categories, authors, media] = await Promise.all([
        fetchTotal(apiFetch, '/editorial/articles?limit=1'),
        fetchTotal(apiFetch, '/editorial/opinions?limit=1'),
        fetchTotal(apiFetch, '/editorial/categories?locale=es&limit=1'),
        fetchTotal(apiFetch, '/authors'),
        fetchTotal(apiFetch, '/media?page=1&limit=1'),
      ]);
      if (!cancelled) setCounts({ articles, opinions, categories, authors, media });
    })();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, ready, user]);

  return counts;
}
