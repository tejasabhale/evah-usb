import { IUsbMonitor } from './IUsbMonitor';
import { MockUsbMonitor } from './MockUsbMonitor';
import { NativeUsbMonitor } from './NativeUsbMonitor';

class UsbServiceImpl {
  private monitor: IUsbMonitor;

  constructor() {
    const isTauri = typeof window !== 'undefined' && 
      (Boolean(window.__TAURI__) || Boolean(window.__TAURI_INTERNALS__));

    if (isTauri) {
      this.monitor = new NativeUsbMonitor();
    } else {
      this.monitor = new MockUsbMonitor();
    }
  }

  public getMonitor(): IUsbMonitor {
    return this.monitor;
  }

  public isNative(): boolean {
    return this.monitor.isNative;
  }

  public simulatePlugIn(): void {
    if (this.monitor.simulatePlugIn) {
      this.monitor.simulatePlugIn();
    }
  }

  public simulateRemoval(): void {
    if (this.monitor.simulateRemoval) {
      this.monitor.simulateRemoval();
    }
  }
}

export const UsbService = new UsbServiceImpl();
