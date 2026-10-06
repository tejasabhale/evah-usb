import { IStorageAdapter } from './IStorageAdapter';
import { FileNode, FileSystemStats } from '@/types/filesystem';
import { BrowserStorageAdapter } from './BrowserStorageAdapter';

export class NodeHttpStorageAdapter implements IStorageAdapter {
  public readonly isNative = false;
  private baseUrl: string;
  private fallbackAdapter: BrowserStorageAdapter;
  private isServerHealthy = false;
  private token: string | null = null;

  constructor(baseUrl = 'http://127.0.0.1:3927') {
    this.baseUrl = baseUrl;
    this.fallbackAdapter = new BrowserStorageAdapter();
  }

  public setToken(token: string | null): void {
    this.token = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  public async initialize(basePath?: string): Promise<boolean> {
    await this.fallbackAdapter.initialize(basePath);
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(1000),
      });
      if (res.ok) {
        this.isServerHealthy = true;
        return true;
      }
    } catch {
      // Server not running locally, seamlessly use fallback browser adapter
      this.isServerHealthy = false;
    }
    return true;
  }

  public async readFile(path: string): Promise<string> {
    if (!this.isServerHealthy) {
      return this.fallbackAdapter.readFile(path);
    }
    try {
      const res = await fetch(
        `${this.baseUrl}/api/files/read?path=${encodeURIComponent(path)}`,
        { headers: this.getHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      return body.data.content;
    } catch {
      return this.fallbackAdapter.readFile(path);
    }
  }

  public async writeFile(path: string, content: string): Promise<void> {
    // Write to fallback memory/local store
    await this.fallbackAdapter.writeFile(path, content);
    if (!this.isServerHealthy) return;

    try {
      await fetch(`${this.baseUrl}/api/files/write`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ path, content }),
      });
    } catch {
      // Local fallback already holds data
    }
  }

  public async deleteFile(path: string): Promise<void> {
    await this.fallbackAdapter.deleteFile(path);
    if (!this.isServerHealthy) return;

    try {
      await fetch(
        `${this.baseUrl}/api/files/delete?path=${encodeURIComponent(path)}`,
        { method: 'DELETE', headers: this.getHeaders() }
      );
    } catch {
      // Ignored
    }
  }

  public async createDirectory(path: string): Promise<void> {
    await this.fallbackAdapter.createDirectory(path);
    if (!this.isServerHealthy) return;

    try {
      await fetch(`${this.baseUrl}/api/files/mkdir`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ path }),
      });
    } catch {
      // Ignored
    }
  }

  public async deleteDirectory(path: string): Promise<void> {
    await this.fallbackAdapter.deleteDirectory(path);
    if (!this.isServerHealthy) return;

    try {
      await fetch(
        `${this.baseUrl}/api/files/rmdir?path=${encodeURIComponent(path)}`,
        { method: 'DELETE', headers: this.getHeaders() }
      );
    } catch {
      // Ignored
    }
  }

  public async listDirectory(path: string): Promise<FileNode[]> {
    if (!this.isServerHealthy) {
      return this.fallbackAdapter.listDirectory(path);
    }
    try {
      const res = await fetch(
        `${this.baseUrl}/api/files/list?path=${encodeURIComponent(path)}`,
        { headers: this.getHeaders() }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      const rawItems = (body.data.items || []) as Array<{
        id: string;
        name: string;
        path: string;
        type: 'file' | 'directory';
        size: number;
        extension?: string;
        createdAt: number;
        updatedAt: number;
      }>;
      return rawItems.map((item) => ({
        id: item.id,
        name: item.name,
        path: item.path,
        isDirectory: item.type === 'directory',
        sizeBytes: item.size,
        mimeType: item.type === 'directory' ? 'inode/directory' : 'application/octet-stream',
        createdAt: new Date(item.createdAt).toISOString(),
        updatedAt: new Date(item.updatedAt).toISOString(),
        extension: item.extension,
      }));
    } catch {
      return this.fallbackAdapter.listDirectory(path);
    }
  }

  public async exists(path: string): Promise<boolean> {
    return this.fallbackAdapter.exists(path);
  }

  public async getStats(): Promise<FileSystemStats> {
    if (!this.isServerHealthy) {
      return this.fallbackAdapter.getStats();
    }
    try {
      const res = await fetch(`${this.baseUrl}/api/files/telemetry`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      return {
        totalFiles: body.data.fileCount,
        totalDirectories: body.data.directoryCount,
        totalSizeBytes: body.data.usedCapacityBytes,
        freeSizeBytes: body.data.freeCapacityBytes,
      };
    } catch {
      return this.fallbackAdapter.getStats();
    }
  }

  public async exportFile(path: string): Promise<Blob> {
    return this.fallbackAdapter.exportFile(path);
  }

  public async importFile(targetDir: string, file: File): Promise<FileNode> {
    return this.fallbackAdapter.importFile(targetDir, file);
  }
}
