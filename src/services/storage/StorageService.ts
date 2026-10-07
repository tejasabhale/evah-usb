import { IStorageAdapter } from './IStorageAdapter';
import { BrowserStorageAdapter } from './BrowserStorageAdapter';
import { NativeUSBStorageAdapter } from './NativeUSBStorageAdapter';
import { NodeHttpStorageAdapter } from './NodeHttpStorageAdapter';

class StorageServiceImpl {
  private adapter: IStorageAdapter;

  constructor() {
    // Detect if running inside Tauri environment
    const isTauri = typeof window !== 'undefined' && 
      (Boolean(window.__TAURI__) || Boolean(window.__TAURI_INTERNALS__));
    
    if (isTauri) {
      this.adapter = new NativeUSBStorageAdapter();
    } else {
      this.adapter = new NodeHttpStorageAdapter();
    }
  }

  public getAdapter(): IStorageAdapter {
    return this.adapter;
  }

  public isNative(): boolean {
    return this.adapter.isNative;
  }

  public async initialize(basePath?: string): Promise<boolean> {
    return this.adapter.initialize(basePath);
  }

  public setAuthToken(token: string | null): void {
    if (this.adapter instanceof NodeHttpStorageAdapter) {
      this.adapter.setToken(token);
    }
  }
}

export const StorageService = new StorageServiceImpl();
