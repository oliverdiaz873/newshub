import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let dir: string;
  let storage: StorageService;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'nh-storage-'));
    storage = new StorageService(dir);
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('round-trips bytes under an opaque key', async () => {
    const key = await storage.save(Buffer.from('bytes'), 'jpg');
    expect(key).toMatch(/^[0-9a-f]{2}\/[0-9a-f-]{36}\.jpg$/);
    await expect(storage.read(key)).resolves.toEqual(Buffer.from('bytes'));
    await storage.remove(key);
    await expect(storage.read(key)).resolves.toBeNull();
  });

  it('rejects traversal and malformed keys', async () => {
    await expect(storage.read('../../etc/passwd')).resolves.toBeNull();
    await expect(storage.read('/images/news/politica/congreso.avif')).resolves.toBeNull();
    await expect(storage.read('not-a-key')).resolves.toBeNull();
    expect(() => storage.absolutePath('../escape.jpg')).toThrow();
  });
});
