import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppConfigService } from '../config/app-config.service';

export interface StorageAdapter {
  save(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

/** Local-disk adapter. Files live under <cwd>/uploads (spec §A10 storage). */
class DiskStorageAdapter implements StorageAdapter {
  constructor(private readonly baseDir: string) {}

  private full(key: string): string {
    // prevent path traversal — keys are opaque uuids, but be defensive
    const target = resolve(this.baseDir, key);
    if (!target.startsWith(resolve(this.baseDir))) {
      throw new Error('invalid storage key');
    }
    return target;
  }

  async save(key: string, data: Buffer): Promise<void> {
    const path = this.full(key);
    await fs.mkdir(dirname(path), { recursive: true });
    await fs.writeFile(path, data);
  }

  read(key: string): Promise<Buffer> {
    return fs.readFile(this.full(key));
  }

  async remove(key: string): Promise<void> {
    await fs.rm(this.full(key), { force: true });
  }
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly baseDir = join(process.cwd(), 'uploads');
  private readonly disk = new DiskStorageAdapter(this.baseDir);

  constructor(private readonly settings: AppConfigService) {}

  /** Adapter chosen by the storage_driver setting (only disk implemented). */
  private adapter(): StorageAdapter {
    const driver = this.settings.getString('storage_driver', 'disk');
    if (driver !== 'disk') {
      this.logger.warn(`storage_driver="${driver}" not implemented; using disk`);
    }
    return this.disk;
  }

  /** Deterministic opaque key: <uuid>/<sanitized-name>. */
  generateKey(originalName: string): string {
    const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    return `${randomUUID()}-${safe}`;
  }

  save(key: string, data: Buffer): Promise<void> {
    return this.adapter().save(key, data);
  }

  read(key: string): Promise<Buffer> {
    return this.adapter().read(key);
  }

  remove(key: string): Promise<void> {
    return this.adapter().remove(key);
  }
}
