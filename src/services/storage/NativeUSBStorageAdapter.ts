import { IStorageAdapter } from './IStorageAdapter';
import { FileNode, FileSystemStats } from '@/types/filesystem';

// Declare Tauri invoke global if present
declare global {
  interface Window {
    __TAURI_INTERNALS__?: any;
    __TAURI__?: any;
  }
}

export class NativeUSBStorageAdapter implements IStorageAdapter {
  public readonly isNative = true;
  private basePath = '';

  private async invoke<T>(cmd: string, args: Record<string, any> = {}): Promise<T> {
    if (window.__TAURI__?.core?.invoke) {
      return window.__TAURI__.core.invoke(cmd, args);
    }
    if ((window as any).__TAURI_INVOKE__) {
      return (window as any).__TAURI_INVOKE__(cmd, args);
    }
    throw new Error('Tauri native bridge not available in this runtime');
  }

  public async initialize(basePath: string = ''): Promise<boolean> {
    this.basePath = basePath;
    try {
      await this.invoke('init_evah_storage', { basePath });
      return true;
    } catch (e) {
      console.error('Failed to initialize native USB storage', e);
      return false;
    }
  }

  public async readFile(path: string): Promise<string> {
    return this.invoke<string>('fs_read_file', { path });
  }

  public async writeFile(path: string, content: string): Promise<void> {
    await this.invoke('fs_write_file', { path, content });
  }

  public async deleteFile(path: string): Promise<void> {
    await this.invoke('fs_delete_file', { path });
  }

  public async createDirectory(path: string): Promise<void> {
    await this.invoke('fs_create_dir', { path });
  }

  public async deleteDirectory(path: string): Promise<void> {
    await this.invoke('fs_delete_dir', { path });
  }

  public async listDirectory(path: string): Promise<FileNode[]> {
    return this.invoke<FileNode[]>('fs_list_dir', { path });
  }

  public async exists(path: string): Promise<boolean> {
    return this.invoke<boolean>('fs_exists', { path });
  }

  public async getStats(): Promise<FileSystemStats> {
    return this.invoke<FileSystemStats>('fs_get_stats');
  }

  public async exportFile(path: string): Promise<Blob> {
    const content = await this.readFile(path);
    return new Blob([content], { type: 'application/octet-stream' });
  }

  public async importFile(targetDir: string, file: File): Promise<FileNode> {
    const content = await file.text();
    const fullPath = `${targetDir.endsWith('/') ? targetDir.slice(0, -1) : targetDir}/${file.name}`;
    await this.writeFile(fullPath, content);
    return {
      id: `file_${fullPath}`,
      name: file.name,
      path: fullPath,
      isDirectory: false,
      sizeBytes: file.size,
      mimeType: file.type || 'text/plain',
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
  }
}
