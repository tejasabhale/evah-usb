import { IStorageAdapter } from './IStorageAdapter';
import { FileNode, FileSystemStats } from '@/types/filesystem';

const STORAGE_KEY = 'evah_v1_filesystem';

export class BrowserStorageAdapter implements IStorageAdapter {
  public readonly isNative = false;
  private files: Map<string, FileNode> = new Map();
  private initialized = false;

  public async initialize(basePath: string = '/EVAH/data'): Promise<boolean> {
    if (this.initialized) return true;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, FileNode>;
        for (const [k, v] of Object.entries(parsed)) {
          this.files.set(k, v);
        }
      } else {
        await this.seedDefaultFileSystem();
      }
      this.initialized = true;
      return true;
    } catch (e) {
      console.warn('Failed to load filesystem from localStorage, seeding in-memory', e);
      await this.seedDefaultFileSystem();
      this.initialized = true;
      return true;
    }
  }

  private async persist(): Promise<void> {
    try {
      const obj: Record<string, FileNode> = {};
      for (const [k, v] of this.files.entries()) {
        obj[k] = v;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.error('Storage quota exceeded or error persisting filesystem', e);
    }
  }

  private async seedDefaultFileSystem(): Promise<void> {
    const now = new Date().toISOString();

    const initialDirs = [
      '/EVAH',
      '/EVAH/data',
      '/EVAH/data/files',
      '/EVAH/data/files/Documents',
      '/EVAH/data/files/Downloads',
      '/EVAH/data/files/Pictures',
      '/EVAH/data/files/Videos',
      '/EVAH/data/files/Projects',
      '/EVAH/data/files/Notes',
      '/EVAH/data/vault',
      '/EVAH/data/wallpapers',
      '/EVAH/data/themes',
      '/EVAH/data/browser',
      '/EVAH/data/settings',
      '/EVAH/data/sessions',
    ];

    for (const dir of initialDirs) {
      const name = dir.split('/').pop() || 'EVAH';
      this.files.set(dir, {
        id: `dir_${dir}`,
        name,
        path: dir,
        isDirectory: true,
        sizeBytes: 0,
        mimeType: 'inode/directory',
        updatedAt: now,
        createdAt: now,
      });
    }

    // Seed default starter files
    const sampleFiles = [
      {
        path: '/EVAH/data/files/Documents/Welcome-to-EVAH.md',
        name: 'Welcome-to-EVAH.md',
        extension: 'md',
        mimeType: 'text/markdown',
        content: `# Welcome to EVAH OS\n\n**Your Personal Digital Environment, Everywhere.**\n\nEVAH is an offline-first, USB-bound desktop environment engineered with:\n- High-security local vault (AES-256-GCM)\n- Dynamic Theme Studio & custom wallpaper manager\n- Instant panic lock (Ctrl+Shift+L)\n- Automatic USB removal detection\n- Self-contained file workspace\n\nCarry your digital workspace in your pocket on any USB stick!`
      },
      {
        path: '/EVAH/data/files/Documents/USB-Security-Guide.txt',
        name: 'USB-Security-Guide.txt',
        extension: 'txt',
        mimeType: 'text/plain',
        content: `EVAH USB Security Architecture:\n1. Key Derivation: Passwords derived locally with PBKDF2/Argon2id.\n2. In-Memory Vault: Zero plain-text secrets persisted to disk.\n3. USB Heartbeat: When drive disappears, session drops immediately.\n4. Clipboard Protection: Copied secrets wiped in 15 seconds.`
      },
      {
        path: '/EVAH/data/files/Projects/main.rs',
        name: 'main.rs',
        extension: 'rs',
        mimeType: 'text/x-rust',
        content: `// EVAH Core USB Monitor Daemon\nfn main() {\n    println!("EVAH Native Shell Initialized.");\n    println!("Watching USB volume markers: EVAH_DEVICE");\n}`
      },
      {
        path: '/EVAH/data/files/Notes/Meeting-Notes.md',
        name: 'Meeting-Notes.md',
        extension: 'md',
        mimeType: 'text/markdown',
        content: `## Project EVAH Roadmap\n\n- [x] Full offline desktop environment\n- [x] Zero cloud dependency\n- [x] Theme personalization studio\n- [x] Encrypted password vault`
      }
    ];

    for (const file of sampleFiles) {
      this.files.set(file.path, {
        id: `file_${file.path}`,
        name: file.name,
        path: file.path,
        isDirectory: false,
        sizeBytes: new Blob([file.content]).size,
        mimeType: file.mimeType,
        extension: file.extension,
        content: file.content,
        updatedAt: now,
        createdAt: now,
      });
    }

    await this.persist();
  }

  public async readFile(path: string): Promise<string> {
    await this.initialize();
    const node = this.files.get(path);
    if (!node || node.isDirectory) {
      throw new Error(`File not found: ${path}`);
    }
    return node.content || '';
  }

  public async writeFile(path: string, content: string): Promise<void> {
    await this.initialize();
    const now = new Date().toISOString();
    const name = path.split('/').pop() || 'untitled';
    const ext = name.includes('.') ? name.split('.').pop() : undefined;
    
    // Ensure parent directory exists
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    if (parentPath && !this.files.has(parentPath)) {
      await this.createDirectory(parentPath);
    }

    const node: FileNode = {
      id: `file_${path}`,
      name,
      path,
      isDirectory: false,
      sizeBytes: new Blob([content]).size,
      mimeType: this.guessMimeType(name),
      extension: ext,
      content,
      updatedAt: now,
      createdAt: this.files.get(path)?.createdAt || now,
    };

    this.files.set(path, node);
    await this.persist();
  }

  public async deleteFile(path: string): Promise<void> {
    await this.initialize();
    if (!this.files.has(path)) {
      throw new Error(`File not found: ${path}`);
    }
    this.files.delete(path);
    await this.persist();
  }

  public async createDirectory(path: string): Promise<void> {
    await this.initialize();
    if (this.files.has(path)) return;

    // Recursively ensure parents
    const parts = path.split('/').filter(Boolean);
    let current = '';
    const now = new Date().toISOString();

    for (const part of parts) {
      current += `/${part}`;
      if (!this.files.has(current)) {
        this.files.set(current, {
          id: `dir_${current}`,
          name: part,
          path: current,
          isDirectory: true,
          sizeBytes: 0,
          mimeType: 'inode/directory',
          updatedAt: now,
          createdAt: now,
        });
      }
    }

    await this.persist();
  }

  public async deleteDirectory(path: string): Promise<void> {
    await this.initialize();
    const toDelete: string[] = [];
    for (const k of this.files.keys()) {
      if (k === path || k.startsWith(path + '/')) {
        toDelete.push(k);
      }
    }
    for (const k of toDelete) {
      this.files.delete(k);
    }
    await this.persist();
  }

  public async listDirectory(path: string): Promise<FileNode[]> {
    await this.initialize();
    const normalized = path.endsWith('/') ? path.slice(0, -1) : path;
    const results: FileNode[] = [];

    for (const [nodePath, node] of this.files.entries()) {
      if (nodePath === normalized) continue;
      if (nodePath.startsWith(normalized + '/')) {
        // Only direct children
        const subPath = nodePath.slice(normalized.length + 1);
        if (!subPath.includes('/')) {
          results.push(node);
        }
      }
    }

    return results.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  public async exists(path: string): Promise<boolean> {
    await this.initialize();
    return this.files.has(path);
  }

  public async rename(oldPath: string, newPath: string): Promise<void> {
    await this.initialize();
    const existing = this.files.get(oldPath);
    if (!existing) {
      throw new Error(`File or directory not found: ${oldPath}`);
    }

    const newName = newPath.split('/').pop() || 'untitled';
    const newExt = newName.includes('.') ? newName.split('.').pop() : undefined;
    const now = new Date().toISOString();

    if (existing.isDirectory) {
      // Rename the directory itself and all descendants
      this.files.delete(oldPath);
      this.files.set(newPath, {
        ...existing,
        id: `dir_${newPath}`,
        name: newName,
        path: newPath,
        updatedAt: now,
      });

      const prefix = oldPath + '/';
      const toUpdate: Array<{ oldKey: string; updatedNode: FileNode }> = [];
      for (const [k, node] of this.files.entries()) {
        if (k.startsWith(prefix)) {
          const subSuffix = k.substring(prefix.length);
          const updatedPath = `${newPath}/${subSuffix}`;
          toUpdate.push({
            oldKey: k,
            updatedNode: {
              ...node,
              id: node.isDirectory ? `dir_${updatedPath}` : `file_${updatedPath}`,
              path: updatedPath,
              updatedAt: now,
            },
          });
        }
      }
      for (const item of toUpdate) {
        this.files.delete(item.oldKey);
        this.files.set(item.updatedNode.path, item.updatedNode);
      }
    } else {
      this.files.delete(oldPath);
      this.files.set(newPath, {
        ...existing,
        id: `file_${newPath}`,
        name: newName,
        path: newPath,
        extension: newExt,
        updatedAt: now,
      });
    }

    await this.persist();
  }

  public async getStats(): Promise<FileSystemStats> {
    await this.initialize();
    let totalFiles = 0;
    let totalDirectories = 0;
    let totalSizeBytes = 0;

    for (const node of this.files.values()) {
      if (node.isDirectory) {
        totalDirectories++;
      } else {
        totalFiles++;
        totalSizeBytes += node.sizeBytes;
      }
    }

    // Default mock 32 GB USB drive
    const totalCapacity = 32 * 1024 * 1024 * 1024;
    return {
      totalFiles,
      totalDirectories,
      totalSizeBytes,
      freeSizeBytes: totalCapacity - totalSizeBytes,
    };
  }

  public async exportFile(path: string): Promise<Blob> {
    const content = await this.readFile(path);
    const node = this.files.get(path);
    return new Blob([content], { type: node?.mimeType || 'text/plain' });
  }

  public async importFile(targetDir: string, file: File): Promise<FileNode> {
    const text = await file.text();
    const fullPath = `${targetDir.endsWith('/') ? targetDir.slice(0, -1) : targetDir}/${file.name}`;
    await this.writeFile(fullPath, text);
    return this.files.get(fullPath)!;
  }

  private guessMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'md': return 'text/markdown';
      case 'txt': return 'text/plain';
      case 'json': return 'application/json';
      case 'png': return 'image/png';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'svg': return 'image/svg+xml';
      case 'pdf': return 'application/pdf';
      case 'js':
      case 'ts': return 'text/javascript';
      case 'html': return 'text/html';
      case 'css': return 'text/css';
      default: return 'application/octet-stream';
    }
  }
}
