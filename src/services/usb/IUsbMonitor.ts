import { UsbDevice, UsbEvent, UsbEventType } from '@/types/usb';

export type UsbEventListener = (event: UsbEvent) => void;

export interface IUsbMonitor {
  isNative: boolean;
  getConnectedDevice(): UsbDevice | null;
  startMonitoring(): Promise<void>;
  stopMonitoring(): void;
  addEventListener(listener: UsbEventListener): () => void;
  // Methods for simulated dev mode
  simulatePlugIn?(device?: Partial<UsbDevice>): void;
  simulateRemoval?(): void;
}
