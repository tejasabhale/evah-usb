export interface FileNode {
  id: string;
  name: string;
  path: string; // Absolute path within EVAH (e.g. /data/files/Documents/readme.txt)
  isDirectory: boolean;
  sizeBytes: number;
  mimeType: string;
  updatedAt: string;
  createdAt: string;
  extension?: string;
  content?: string; // string or base64 data for binary
  isProtected?: boolean;
}

export interface FileSystemStats {
  totalFiles: number;
  totalDirectories: number;
  totalSizeBytes: number;
  freeSizeBytes: number;
}
