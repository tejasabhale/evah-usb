import { SessionLifecycle, SessionSettings, UserProfile } from '@/types/session';
import { AuthService } from '@/services/auth/AuthService';
import { VaultCryptoService } from '@/services/vault/VaultCryptoService';
import { ClipboardService } from '@/services/clipboard/ClipboardService';
import { UsbService } from '@/services/usb/UsbService';
import { UsbEvent } from '@/types/usb';

export type SessionStateListener = (state: SessionLifecycle, reason?: string) => void;

export class SessionManager {
  private static instance: SessionManager;
  private currentState: SessionLifecycle = 'DEVICE_NOT_FOUND';
  private listeners: Set<SessionStateListener> = new Set();
  private settings: SessionSettings = {
    autoLockMinutes: 10,
    clipboardTimeoutSeconds: 15,
    welcomeVoiceEnabled: true,
    welcomeVoicePitch: 1.0,
    welcomeVoiceRate: 1.0,
    welcomeVoiceVolume: 0.9,
    panicShortcut: 'Ctrl+Shift+L',
    deviceAutoLaunch: true,
  };
  private lastActivityTimestamp = Date.now();
  private inactivityCheckInterval: any = null;

  private constructor() {
    this.bindUsbMonitor();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  public getState(): SessionLifecycle {
    return this.currentState;
  }

  public getSettings(): SessionSettings {
    return this.settings;
  }

  public updateSettings(updates: Partial<SessionSettings>): void {
    this.settings = { ...this.settings, ...updates };
    AuthService.getInstance().saveSettings(this.settings);
  }

  public addListener(listener: SessionStateListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(newState: SessionLifecycle, reason?: string): void {
    this.currentState = newState;
    for (const l of this.listeners) {
      try {
        l(newState, reason);
      } catch (e) {
        console.error('Error notifying session state listener', e);
      }
    }
  }

  public async initialize(): Promise<void> {
    const auth = AuthService.getInstance();
    this.settings = await auth.getSettings();

    // Check if USB device is present
    const monitor = UsbService.getMonitor();
    await monitor.startMonitoring();
    const device = monitor.getConnectedDevice();

    if (device && device.isConnected) {
      this.setState('DEVICE_DETECTED');
      setTimeout(async () => {
        this.setState('DEVICE_VERIFIED');
        this.setState('BOOT');
      }, 300);
    } else {
      this.setState('DEVICE_NOT_FOUND');
    }

    this.startInactivityMonitoring();
  }

  public completeBoot(isFirstRun: boolean): void {
    if (isFirstRun) {
      this.setState('FIRST_RUN');
    } else {
      this.setState('LOGIN');
    }
  }

  public completeLogin(): void {
    this.lastActivityTimestamp = Date.now();
    this.setState('ACTIVE_SESSION');
  }

  public recordActivity(): void {
    this.lastActivityTimestamp = Date.now();
  }

  public lockSession(reason: string = 'User initiated lock'): void {
    // Drop decrypted memory
    VaultCryptoService.getInstance().lockVault();
    // Wipe sensitive clipboard
    ClipboardService.getInstance().clearImmediately();
    this.setState('LOCKED', reason);
  }

  public panicLock(): void {
    // Immediate panic lockdown
    AuthService.getInstance().purgeKeys();
    VaultCryptoService.getInstance().lockVault();
    ClipboardService.getInstance().clearImmediately();
    this.setState('PANIC_LOCKED', 'Emergency Panic Lock Triggered');
  }

  public async unlockSession(password: string): Promise<boolean> {
    const auth = AuthService.getInstance();
    const ok = await auth.authenticate(password);
    if (ok) {
      this.lastActivityTimestamp = Date.now();
      this.setState('ACTIVE_SESSION');
      return true;
    }
    return false;
  }

  public logout(): void {
    AuthService.getInstance().purgeKeys();
    VaultCryptoService.getInstance().lockVault();
    ClipboardService.getInstance().clearImmediately();
    this.setState('LOGIN', 'User Logged Out');
  }

  private bindUsbMonitor(): void {
    const monitor = UsbService.getMonitor();
    monitor.addEventListener((event: UsbEvent) => {
      if (event.type === 'usb_removed') {
        // Enforce physical security: purge all sensitive memory!
        AuthService.getInstance().purgeKeys();
        VaultCryptoService.getInstance().lockVault();
        ClipboardService.getInstance().clearImmediately();
        this.setState('SESSION_INVALIDATED', 'EVAH USB physical removal detected');
      } else if (event.type === 'usb_detected' || event.type === 'usb_verified') {
        if (this.currentState === 'SESSION_INVALIDATED' || this.currentState === 'DEVICE_NOT_FOUND') {
          // Reconnect brings user to login
          this.setState('LOGIN', 'EVAH USB reconnected');
        }
      }
    });
  }

  private startInactivityMonitoring(): void {
    if (this.inactivityCheckInterval) clearInterval(this.inactivityCheckInterval);

    this.inactivityCheckInterval = setInterval(() => {
      if (this.currentState !== 'ACTIVE_SESSION') return;
      if (this.settings.autoLockMinutes <= 0) return; // 0 = Never

      const elapsedMs = Date.now() - this.lastActivityTimestamp;
      const timeoutMs = this.settings.autoLockMinutes * 60 * 1000;

      if (elapsedMs >= timeoutMs) {
        this.lockSession('Inactivity timeout reached');
      }
    }, 10000); // Check every 10 seconds
  }
}
