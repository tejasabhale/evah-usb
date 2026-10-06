export interface DeviceMarker {
  version: string;
  deviceId: string;
  deviceName: string;
  initializedAt: string;
  storageLayoutVersion: number;
}

export interface SystemStatus {
  isUsbConnected: boolean;
  isUnlocked: boolean;
  activeSession: boolean;
  storagePath: string;
  uptimeSeconds: number;
  memoryUsageMb: number;
  vaultStatus: 'locked' | 'unlocked' | 'uninitialized';
}
