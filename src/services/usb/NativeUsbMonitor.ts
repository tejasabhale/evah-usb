import { IUsbMonitor, UsbEventListener } from './IUsbMonitor';
import { UsbDevice, UsbEvent } from '@/types/usb';

export class NativeUsbMonitor implements IUsbMonitor {
  public readonly isNative = true;
  private currentDevice: UsbDevice | null = null;
  private listeners: Set<UsbEventListener> = new Set();
  private unlistenFns: Array<() => void> = [];

  public getConnectedDevice(): UsbDevice | null {
    return this.currentDevice;
  }

  public async startMonitoring(): Promise<void> {
    const tauri = window.__TAURI__;
    if (!tauri || !tauri.event) {
      console.warn('Tauri event bridge not available for NativeUsbMonitor');
      return;
    }

    try {
      // Query initial device status from Rust backend
      if (tauri.core?.invoke) {
        const device = await tauri.core.invoke('get_current_usb_device');
        if (device) {
          this.currentDevice = device;
          this.emit({
            type: 'usb_detected',
            device,
            timestamp: Date.now(),
          });
        }
      }

      // Listen for Rust backend events
      const events = ['usb_detected', 'usb_verified', 'usb_removed', 'usb_mount_changed', 'session_invalidated'];
      for (const eventName of events) {
        const unlisten = await tauri.event.listen(eventName, (payload: any) => {
          if (eventName === 'usb_detected' || eventName === 'usb_verified') {
            this.currentDevice = payload.payload;
          } else if (eventName === 'usb_removed') {
            this.currentDevice = null;
          }
          this.emit({
            type: eventName as any,
            device: this.currentDevice || undefined,
            timestamp: Date.now(),
            reason: payload.payload?.reason,
          });
        });
        this.unlistenFns.push(unlisten);
      }
    } catch (e) {
      console.error('Error starting native USB monitor:', e);
    }
  }

  public stopMonitoring(): void {
    for (const unlisten of this.unlistenFns) {
      unlisten();
    }
    this.unlistenFns = [];
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
        console.error('Error in Native USB event listener', e);
      }
    }
  }
}
