import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import sharp from 'sharp';
import { MediaRepository } from './media.repository';
import { StorageService } from './storage.service';
import { coverUrl } from './cover-url';
import { buildMeta, normalizePagination } from '../../common/pagination';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FORMAT_TO_MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};
const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export interface MediaView {
  id: string;
  url: string;
  mime: string;
  width: number | null;
  height: number | null;
  createdAt: string;
}

@Injectable()
export class MediaService {
  private readonly storage = new StorageService();

  constructor(@Inject(MediaRepository) private readonly media: MediaRepository) {}

  shape(row: { id: string; storageKey: string; mime: string; width: number | null; height: number | null; createdAt: Date }): MediaView {
    return {
      id: row.id,
      url: coverUrl({ id: row.id, storageKey: row.storageKey }),
      mime: row.mime,
      width: row.width,
      height: row.height,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(query: { page?: number; limit?: number }) {
    const { page, limit } = normalizePagination(query.page, query.limit);
    const total = await this.media.countAll();
    const rows = await this.media.list((page - 1) * limit, limit);
    return { data: rows.map((row) => this.shape(row)), meta: buildMeta(page, limit, total) };
  }

  async upload(file: { buffer: Buffer; size: number; mimetype: string; originalname: string }, userId: string): Promise<MediaView> {
    if (!file?.buffer?.length) {
      throw new UnprocessableEntityException('File is required.');
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new UnprocessableEntityException('File exceeds the 5 MB limit.');
    }
    let meta: { format?: string; width?: number; height?: number };
    try {
      meta = await sharp(file.buffer).metadata();
    } catch {
      throw new UnprocessableEntityException('File is not a readable image.');
    }
    const mime = meta.format ? FORMAT_TO_MIME[meta.format] : undefined;
    const ext = mime ? MIME_TO_EXT[mime] : undefined;
    // Real parsed format must match the declared MIME; extension is never trusted.
    if (!mime || !ext || mime !== file.mimetype) {
      throw new UnprocessableEntityException('Format not allowed. Use JPEG, PNG, WebP or AVIF.');
    }
    const key = await this.storage.save(file.buffer, ext);
    try {
      const row = await this.media.create({
        storageKey: key,
        mime,
        width: meta.width ?? null,
        height: meta.height ?? null,
        createdById: userId,
      });
      return this.shape(row);
    } catch (err) {
      await this.storage.remove(key);
      throw err;
    }
  }
  async remove(id: string) {
    const row = await this.media.findFullById(id);
    if (!row) throw new NotFoundException('Media asset not found.');
    if ((await this.media.countReferences(id)) > 0) {
      throw new ConflictException({
        code: 'media_in_use',
        error: 'Conflict',
        message: 'Media asset is still referenced by content.',
      });
    }
    // Remove the file first: orphans are harmless, broken references are not.
    await this.storage.remove(row.storageKey);
    await this.media.deleteById(id);
  }

  /**
   * File payload for the public content route. Null when the row is missing
   * or the file is not on this disk (e.g. legacy storefront paths, which
   * keep their own URLs and never hit this route).
   */
  async readAsset(id: string): Promise<{ mime: string; absolutePath: string } | null> {
    const row = await this.media.findFullById(id);
    if (!row) return null;
    let absolute: string;
    try {
      absolute = this.storage.absolutePath(row.storageKey);
    } catch {
      return null;
    }
    if ((await this.storage.read(row.storageKey)) === null) return null;
    return { mime: row.mime, absolutePath: absolute };
  }
}
