import { IUsbMonitor, UsbEventListener } from './IUsbMonitor';
import { UsbDevice, UsbEvent } from '@/types/usb';

export class MockUsbMonitor implements IUsbMonitor {
  public readonly isNative = false;
  private currentDevice: UsbDevice | null = null;
  private listeners: Set<UsbEventListener> = new Set();
  private isRunning = false;

  constructor() {
    // Default simulated USB device
    this.currentDevice = {
      id: 'evah_usb_device_001',
      name: 'EVAH_PORTABLE_32GB',
      mountPath: 'E:\\EVAH',
      isConnected: true,
      isVerified: true,
      totalSpaceBytes: 32 * 1024 * 1024 * 1024,
      freeSpaceBytes: 28.4 * 1024 * 1024 * 1024,
      markerFound: true,
      serialNumber: 'EV-8842-SEC-99',
      vendorName: 'SanDisk / EVAH Secure',
      productName: 'Ultra Flair EVAH Edition',
      evahDataDir: 'E:\\EVAH\\data',
    };
  }

  public getConnectedDevice(): UsbDevice | null {
    return this.currentDevice;
  }

  public async startMonitoring(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    // Simulate initial detection if device is set
    if (this.currentDevice && this.currentDevice.isConnected) {
      setTimeout(() => {
        this.emit({
          type: 'usb_detected',
          device: this.currentDevice!,
          timestamp: Date.now(),
        });
        setTimeout(() => {
          this.emit({
            type: 'usb_verified',
            device: this.currentDevice!,
            timestamp: Date.now(),
          });
        }, 400);
      }, 200);
    }
  }

  public stopMonitoring(): void {
    this.isRunning = false;
  }

  public addEventListener(listener: UsbEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: UsbEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in USB event listener', e);
      }
    }
  }

  public simulatePlugIn(deviceData?: Partial<UsbDevice>): void {
    this.currentDevice = {
      id: 'evah_usb_device_001',
      name: 'EVAH_PORTABLE_32GB',
      mountPath: 'E:\\EVAH',
      isConnected: true,
      isVerified: true,
      totalSpaceBytes: 32 * 1024 * 1024 * 1024,
      freeSpaceBytes: 28.4 * 1024 * 1024 * 1024,
      markerFound: true,
      serialNumber: 'EV-8842-SEC-99',
      vendorName: 'SanDisk / EVAH Secure',
      productName: 'Ultra Flair EVAH Edition',
      evahDataDir: 'E:\\EVAH\\data',
      ...deviceData,
    };

    this.emit({
      type: 'usb_detected',
      device: this.currentDevice,
      timestamp: Date.now(),
    });

    setTimeout(() => {
      if (this.currentDevice && this.currentDevice.markerFound) {
        this.emit({
          type: 'usb_verified',
          device: this.currentDevice,
          timestamp: Date.now(),
        });
      }
    }, 500);
  }

  public simulateRemoval(): void {
    const prev = this.currentDevice;
    this.currentDevice = null;

    this.emit({
      type: 'usb_removed',
      device: prev || undefined,
      timestamp: Date.now(),
      reason: 'Physical disconnection event detected by storage subsystem',
    });

    this.emit({
      type: 'session_invalidated',
      timestamp: Date.now(),
      reason: 'USB removal security policy enforced',
    });
  }
}
