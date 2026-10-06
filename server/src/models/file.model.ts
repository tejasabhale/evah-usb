export type FileType = 'file' | 'directory';

export interface FileItem {
  id: string;
  name: string;
  path: string; // Relative to USB root e.g. /EVAH/data/files/doc.txt
  type: FileType;
  size: number;
  mimeType?: string;
  extension?: string;
  createdAt: number;
  updatedAt: number;
  isReadOnly?: boolean;
}

export interface FileSystemTelemetry {
  totalCapacityBytes: number;
  usedCapacityBytes: number;
  freeCapacityBytes: number;
  fileCount: number;
  directoryCount: number;
}
