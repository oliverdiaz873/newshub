import { Inject, Injectable } from '@nestjs/common';
import { AuthorsRepository } from './authors.repository';
import { DEFAULT_LOCALE, isSupportedLocale } from '../../common/locale';

export interface AuthorView {
  slug: string;
  name: string;
  bio: string | null;
}

/**
 * Resolves the embeddable author view with ES fallback.
 * Returns null when the author row is missing (data inconsistency guard).
 */
@Injectable()
export class AuthorsService {
  constructor(@Inject(AuthorsRepository) private readonly authors: AuthorsRepository) {}

  async viewFor(id: string, locale: string): Promise<AuthorView | null> {
    const row = await this.authors.findByIdWithLocale(id, locale);
    if (!row) return null;
    const direct = row.translations[0];
    if (direct) return { slug: row.slug, name: direct.name, bio: direct.bio };
    if (isSupportedLocale(locale) && locale !== DEFAULT_LOCALE) {
      const fallback = await this.authors.findByIdWithLocale(id, DEFAULT_LOCALE);
      const t = fallback?.translations[0];
      if (t) return { slug: row.slug, name: t.name, bio: t.bio };
    }
    return { slug: row.slug, name: row.slug, bio: null };
  }
}
