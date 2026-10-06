import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { FileItem, FileSystemTelemetry } from '../models/file.model';
import { BadRequestError, NotFoundError } from '../errors/app-error';

export class StorageRepository {
  private basePath: string;

  constructor(basePath: string = config.usbBasePath) {
    this.basePath = path.resolve(basePath);
  }

  public setBasePath(newPath: string): void {
    this.basePath = path.resolve(newPath);
    logger.info(`Storage base path updated to: ${this.basePath}`);
  }

  public getBasePath(): string {
    return this.basePath;
  }

  /**
   * Safe path resolution to prevent directory traversal
   */
  public safeResolve(relativePath: string): string {
    // Normalize and clean leading slashes
    const cleanRel = relativePath.replace(/^[/\\]+/, '');
    const resolved = path.resolve(this.basePath, cleanRel);

    if (!resolved.startsWith(this.basePath)) {
      throw new BadRequestError('Access denied: path traversal detected');
    }
    return resolved;
  }

  /**
   * Initializes standard EVAH directories on disk
   */
  public async initializeEvahStructure(): Promise<void> {
    const requiredDirs = [
      path.join(this.basePath, 'EVAH'),
      path.join(this.basePath, 'EVAH', 'data'),
      path.join(this.basePath, 'EVAH', 'data', 'files'),
      path.join(this.basePath, 'EVAH', 'data', 'vault'),
      path.join(this.basePath, 'EVAH', 'data', 'wallpapers'),
      path.join(this.basePath, 'EVAH', 'data', 'browser'),
      path.join(this.basePath, 'EVAH', 'data', 'themes'),
      path.join(this.basePath, 'EVAH', 'data', 'settings'),
      path.join(this.basePath, 'EVAH', 'data', 'sessions'),
      path.join(this.basePath, 'EVAH', 'assets'),
      path.join(this.basePath, 'EVAH', 'config'),
    ];

    for (const dir of requiredDirs) {
      await fs.mkdir(dir, { recursive: true });
    }

    // Ensure marker file exists
    const markerFile = path.join(this.basePath, 'EVAH', 'EVAH_DEVICE.json');
    try {
      await fs.access(markerFile);
    } catch {
      const defaultMarker = {
        version: '1.0.0',
        deviceId: 'EVAH-LOCAL-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        deviceName: 'EVAH Portable Drive',
        initializedAt: new Date().toISOString(),
        storageLayoutVersion: 1,
      };
      await fs.writeFile(markerFile, JSON.stringify(defaultMarker, null, 2), 'utf8');
      logger.info('Initialized new EVAH device marker on disk', { markerFile });
    }
  }

  public async exists(relPath: string): Promise<boolean> {
    try {
      const fullPath = this.safeResolve(relPath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  public async readFile(relPath: string): Promise<string> {
    const fullPath = this.safeResolve(relPath);
    try {
      return await fs.readFile(fullPath, 'utf8');
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        throw new NotFoundError(`File not found: ${relPath}`);
      }
      throw err;
    }
  }

  public async readBinary(relPath: string): Promise<Buffer> {
    const fullPath = this.safeResolve(relPath);
    try {
      return await fs.readFile(fullPath);
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        throw new NotFoundError(`File not found: ${relPath}`);
      }
      throw err;
    }
  }

  public async writeFile(relPath: string, content: string | Buffer): Promise<void> {
    const fullPath = this.safeResolve(relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, typeof content === 'string' ? 'utf8' : undefined);
  }

  public async deleteFile(relPath: string): Promise<void> {
    const fullPath = this.safeResolve(relPath);
    try {
      await fs.unlink(fullPath);
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  public async createDirectory(relPath: string): Promise<void> {
    const fullPath = this.safeResolve(relPath);
    await fs.mkdir(fullPath, { recursive: true });
  }

  public async deleteDirectory(relPath: string): Promise<void> {
    const fullPath = this.safeResolve(relPath);
    try {
      await fs.rm(fullPath, { recursive: true, force: true });
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code !== 'ENOENT') {
        throw err;
      }
    }
  }

  public async listDirectory(relPath: string): Promise<FileItem[]> {
    const fullPath = this.safeResolve(relPath);
    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const items: FileItem[] = [];

      for (const entry of entries) {
        const itemFullPath = path.join(fullPath, entry.name);
        const stats = await fs.stat(itemFullPath);
        const itemRelPath = path.relative(this.basePath, itemFullPath).replace(/\\/g, '/');

        items.push({
          id: Buffer.from(itemRelPath).toString('base64url'),
          name: entry.name,
          path: '/' + itemRelPath,
          type: entry.isDirectory() ? 'directory' : 'file',
          size: stats.size,
          extension: entry.isDirectory() ? undefined : path.extname(entry.name).replace('.', ''),
          createdAt: stats.birthtimeMs,
          updatedAt: stats.mtimeMs,
        });
      }

      return items;
    } catch (err: unknown) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ENOENT') {
        return [];
      }
      throw err;
    }
  }

  public async getTelemetry(): Promise<FileSystemTelemetry> {
    let totalFiles = 0;
    let totalDirs = 0;
    let usedBytes = 0;

    const countRecursive = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const itemPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            totalDirs++;
            await countRecursive(itemPath);
          } else {
            totalFiles++;
            const stat = await fs.stat(itemPath);
            usedBytes += stat.size;
          }
        }
      } catch {
        // ignore unreadable dirs
      }
    };

    const evahDir = path.join(this.basePath, 'EVAH');
    await countRecursive(evahDir);

    // Default capacity representation: 32 GB USB drive
    const capacityBytes = 32 * 1024 * 1024 * 1024;

    return {
      totalCapacityBytes: capacityBytes,
      usedCapacityBytes: usedBytes,
      freeCapacityBytes: Math.max(0, capacityBytes - usedBytes),
      fileCount: totalFiles,
      directoryCount: totalDirs,
    };
  }
}

export const storageRepository = new StorageRepository();
