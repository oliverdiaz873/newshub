import { randomUUID } from 'node:crypto';
import { mkdirSync, existsSync } from 'node:fs';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

/**
 * Filesystem storage behind an abstraction (F5).
 * Only opaque server-generated keys ever touch disk; client filenames and
 * paths are never used for storage. Swapping to S3 later means replacing
 * this service, not the editorial logic.
 */
export class StorageService {
  private readonly root: string;

  constructor(root?: string) {
    this.root = resolve(root ?? process.env.MEDIA_DIR ?? 'storage');
    mkdirSync(this.root, { recursive: true });
  }

  /** Stores bytes under `<2-hex>/<uuid>.<ext>`; returns the opaque key. */
  async save(bytes: Buffer, ext: string): Promise<string> {
    const name = `${randomUUID()}.${ext}`;
    // Always forward slashes in keys; absolutePath resolves per-OS below.
    const key = `${name.slice(0, 2)}/${name}`;
    const absolute = this.absolutePath(key);
    mkdirSync(dirname(absolute), { recursive: true });
    await writeFile(absolute, bytes);
    return key;
  }

  async read(key: string): Promise<Buffer | null> {
    const absolute = this.safePath(key);
    if (!absolute || !existsSync(absolute)) return null;
    try {
      return await readFile(absolute);
    } catch {
      return null;
    }
  }

  absolutePath(key: string): string {
    const safe = this.safePath(key);
    if (!safe) throw new Error('Invalid storage key.');
    return safe;
  }

  async remove(key: string): Promise<void> {
    const absolute = this.safePath(key);
    if (!absolute) return;
    await rm(absolute, { force: true });
  }

  /** Null when the key is malformed or escapes the storage root. */
  private safePath(key: string): string | null {
    if (!/^[0-9a-f]{2}\/[0-9a-f-]{36}\.[a-z0-9]{3,5}$/.test(key)) return null;
    const absolute = resolve(this.root, ...key.split('/'));
    if (absolute !== resolve(this.root) && !absolute.startsWith(resolve(this.root) + sep)) return null;
    return absolute;
  }
}
