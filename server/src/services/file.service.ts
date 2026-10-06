import { storageRepository } from '../repositories/storage.repository';
import { FileItem, FileSystemTelemetry } from '../models/file.model';
import { usbService } from './usb.service';
import { DeviceNotFoundError } from '../errors/app-error';

export class FileService {
  private ensureUsbMounted(): void {
    if (!usbService.isUsbPresent()) {
      throw new DeviceNotFoundError('EVAH USB storage device is not connected');
    }
  }

  public async listDirectory(relPath: string = 'EVAH/data/files'): Promise<FileItem[]> {
    this.ensureUsbMounted();
    return storageRepository.listDirectory(relPath);
  }

  public async readFile(relPath: string): Promise<string> {
    this.ensureUsbMounted();
    return storageRepository.readFile(relPath);
  }

  public async writeFile(relPath: string, content: string): Promise<void> {
    this.ensureUsbMounted();
    await storageRepository.writeFile(relPath, content);
  }

  public async deleteFile(relPath: string): Promise<void> {
    this.ensureUsbMounted();
    await storageRepository.deleteFile(relPath);
  }

  public async createDirectory(relPath: string): Promise<void> {
    this.ensureUsbMounted();
    await storageRepository.createDirectory(relPath);
  }

  public async deleteDirectory(relPath: string): Promise<void> {
    this.ensureUsbMounted();
    await storageRepository.deleteDirectory(relPath);
  }

  public async exists(relPath: string): Promise<boolean> {
    this.ensureUsbMounted();
    return storageRepository.exists(relPath);
  }

  public async getTelemetry(): Promise<FileSystemTelemetry> {
    this.ensureUsbMounted();
    return storageRepository.getTelemetry();
  }
}

export const fileService = new FileService();
