import { FileNode, FileSystemStats } from '@/types/filesystem';

export interface IStorageAdapter {
  isNative: boolean;
  initialize(basePath?: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  deleteDirectory(path: string): Promise<void>;
  listDirectory(path: string): Promise<FileNode[]>;
  exists(path: string): Promise<boolean>;
  rename(oldPath: string, newPath: string): Promise<void>;
  getStats(): Promise<FileSystemStats>;
  exportFile(path: string): Promise<Blob>;
  importFile(targetDir: string, file: File): Promise<FileNode>;
}
