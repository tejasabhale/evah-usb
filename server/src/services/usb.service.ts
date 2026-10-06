import path from 'path';
import fs from 'fs/promises';
import { storageRepository } from '../repositories/storage.repository';
import { eventBus } from '../events/event-bus';
import { logger } from '../utils/logger';
import { DeviceMarker } from '../models/session.model';

export class UsbService {
  private isConnected = true;
  private currentMarker: DeviceMarker | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  public async getMarker(): Promise<DeviceMarker | null> {
    const markerPath = path.join(storageRepository.getBasePath(), 'EVAH', 'EVAH_DEVICE.json');
    try {
      const content = await fs.readFile(markerPath, 'utf8');
      this.currentMarker = JSON.parse(content) as DeviceMarker;
      return this.currentMarker;
    } catch {
      return null;
    }
  }

  public isUsbPresent(): boolean {
    return this.isConnected;
  }

  public async verifyDevice(): Promise<boolean> {
    const marker = await this.getMarker();
    const present = marker !== null && this.isConnected;
    return present;
  }

  /**
   * Hardware or simulation trigger to simulate USB removal
   */
  public triggerDisconnect(): void {
    if (!this.isConnected) return;
    this.isConnected = false;
    logger.warn('USB Device physically disconnected or simulated removal');
    eventBus.emitEvah('usb:disconnected');
  }

  /**
   * Trigger to simulate USB re-insertion
   */
  public async triggerConnect(): Promise<void> {
    this.isConnected = true;
    await storageRepository.initializeEvahStructure();
    logger.info('USB Device connected and verified');
    eventBus.emitEvah('usb:connected');
  }

  private startMonitoring(): void {
    if (this.checkInterval) return;
    // Periodic check to verify device marker remains reachable on disk
    this.checkInterval = setInterval(async () => {
      if (!this.isConnected) return;
      const marker = await this.getMarker();
      if (!marker && this.isConnected) {
        this.triggerDisconnect();
      }
    }, 2000);
  }

  public stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}

export const usbService = new UsbService();
