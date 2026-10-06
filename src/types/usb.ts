export interface UsbDevice {
  id: string;
  name: string;
  mountPath: string;
  isConnected: boolean;
  isVerified: boolean;
  totalSpaceBytes: number;
  freeSpaceBytes: number;
  markerFound: boolean;
  serialNumber: string;
  vendorName: string;
  productName: string;
  evahDataDir: string;
}

export type UsbEventType = 
  | 'usb_detected' 
  | 'usb_verified' 
  | 'usb_removed' 
  | 'usb_mount_changed' 
  | 'session_invalidated';

export interface UsbEvent {
  type: UsbEventType;
  device?: UsbDevice;
  timestamp: number;
  reason?: string;
}
