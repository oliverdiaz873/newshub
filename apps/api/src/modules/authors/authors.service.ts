import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthorsRepository } from './authors.repository';
import type { CreateAuthorDto, UpdateAuthorDto } from './dto/author-write.dto';
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

  // ---- Editorial reads (F2, auth required, NOT public) ----

  async list() {
    const rows = await this.authors.listAll();
    return rows.map((row) => this.shape(row));
  }

  async read(id: string) {
    const row = await this.authors.findByIdFull(id);
    if (!row) throw new NotFoundException('Author not found.');
    return this.shape(row);
  }

  // ---- Editorial writes (F2, auth + RBAC enforced at the controller) ----

  async exists(id: string): Promise<boolean> {
    return (await this.authors.findByIdFull(id)) !== null;
  }

  async create(dto: CreateAuthorDto) {
    this.requireSpanish(dto.translations);
    await this.assertSlugFree(dto.slug);
    try {
      const row = await this.authors.createWithTranslations(dto.slug, dto.translations);
      return this.shape(row);
    } catch (err) {
      throw this.asSlugConflict(err);
    }
  }

  async update(id: string, dto: UpdateAuthorDto) {
    const existing = await this.authors.findByIdFull(id);
    if (!existing) throw new NotFoundException('Author not found.');
    if (dto.slug && dto.slug !== existing.slug) {
      await this.assertSlugFree(dto.slug);
      try {
        await this.authors.updateSlug(id, dto.slug);
      } catch (err) {
        throw this.asSlugConflict(err);
      }
    }
    if (dto.translations) {
      for (const t of dto.translations) {
        await this.authors.upsertTranslation(id, t);
      }
    }
    const after = await this.authors.findByIdFull(id);
    if (!after?.translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required.');
    }
    return this.shape(after);
  }

  async remove(id: string) {
    const existing = await this.authors.findByIdFull(id);
    if (!existing) throw new NotFoundException('Author not found.');
    // articles.author is nullable (SET NULL); opinions.author is RESTRICT.
    if ((await this.authors.countOpinions(id)) > 0) {
      throw new ConflictException('Author still has opinions.');
    }
    try {
      await this.authors.deleteAuthor(id);
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
        throw new ConflictException('Author is still referenced.');
      }
      throw err;
    }
  }

  private shape(row: { id: string; slug: string; translations: Array<{ locale: string; name: string; bio: string | null }> }) {
    return {
      id: row.id,
      slug: row.slug,
      translations: row.translations.map((t) => ({ locale: t.locale, name: t.name, bio: t.bio })),
    };
  }

  private requireSpanish(translations: Array<{ locale: string }>) {
    if (!translations.some((t) => t.locale === DEFAULT_LOCALE)) {
      throw new UnprocessableEntityException('Spanish translation is required.');
    }
  }

  private async assertSlugFree(slug: string, excludeId?: string) {
    const hit = await this.authors.findBySlug(slug);
    if (hit && hit.id !== excludeId) {
      throw new ConflictException({
        code: 'slug_taken',
        error: 'Conflict',
        message: `Slug '${slug}' is already taken.`,
      });
    }
  }

  private asSlugConflict(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ConflictException({
        code: 'slug_taken',
        error: 'Conflict',
        message: 'Slug is already taken.',
      });
    }
    throw err;
  }
}
